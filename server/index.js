import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client for auth verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Database connection
const pool = new Pool({
  user: "graphite_user",
  password: "Gr4ph1t3_S3cur3_P@ss!",
  host: "127.0.0.1",
  port: 5432,
  database: "graphite",
});

// Helper function to verify token
async function verifyToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================================================
// FLUX SIGNALING SERVER (Graphite Flux - High-performance transfer engine)
// ============================================================================

// Connected clients: userId -> { ws, user, connectCode }
const fluxClients = new Map();
// Active WebRTC sessions: sessionId -> { initiatorId, responderId, state }
const rtcSessions = new Map();

// Generate 6-character alphanumeric code
function generateConnectCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get or create connect code for user
async function getOrCreateConnectCode(userId) {
  // Check if user already has a code
  const existing = await supabase
    .from("blip_connect_codes")
    .select("code")
    .eq("user_id", userId)
    .single();

  if (existing.data?.code) {
    return existing.data.code;
  }

  // Generate new unique code
  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateConnectCode();
    const { error } = await supabase
      .from("blip_connect_codes")
      .insert({ user_id: userId, code });

    if (!error) break;
    attempts++;
  }

  return code;
}

// Get friends list for user
async function getFriendsList(userId) {
  const { data: friends } = await supabase
    .from("blip_friends")
    .select("friend_id")
    .eq("user_id", userId);

  if (!friends || friends.length === 0) return [];

  const friendIds = friends.map(f => f.friend_id);

  // Get friend details from auth.users
  const friendDetails = [];
  for (const friendId of friendIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(friendId);
    if (user) {
      const isOnline = fluxClients.has(friendId);
      friendDetails.push({
        id: friendId,
        email: user.email,
        displayName: user.email?.split("@")[0] || "User",
        isOnline
      });
    }
  }

  return friendDetails;
}

// Notify friends when user comes online/offline
function notifyFriendsOfStatus(userId, isOnline) {
  fluxClients.forEach((client, clientId) => {
    // Check if this client is a friend of the user
    // For simplicity, we'll notify everyone and let them filter
    // In production, maintain a friends list in memory
    send(client.ws, {
      type: isOnline ? "friend_online" : "friend_offline",
      friendId: userId
    });
  });
}

// Send message to WebSocket
function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Handle Flux WebSocket messages
async function handleFluxMessage(ws, client, message) {
  try {
    const data = JSON.parse(message);
    console.log(`[FLUX] ${client.user.email}: ${data.type}`);

    switch (data.type) {
      // ========== Connection & Keepalive ==========
      case "ping":
        send(ws, { type: "pong" });
        break;

      // ========== Connect Codes ==========
      case "get_connect_code":
        const code = await getOrCreateConnectCode(client.user.id);
        send(ws, { type: "connect_code", code });
        break;

      // ========== Friends ==========
      case "get_friends":
        const friends = await getFriendsList(client.user.id);
        send(ws, { type: "friends_list", friends });
        break;

      case "add_friend":
        // Look up user by connect code
        const { data: codeData } = await supabase
          .from("blip_connect_codes")
          .select("user_id")
          .eq("code", data.code.toUpperCase())
          .single();

        if (!codeData) {
          send(ws, { type: "error", message: "Invalid connect code" });
          break;
        }

        const friendId = codeData.user_id;
        if (friendId === client.user.id) {
          send(ws, { type: "error", message: "Cannot add yourself" });
          break;
        }

        // Check if already friends
        const { data: existing } = await supabase
          .from("blip_friends")
          .select("id")
          .eq("user_id", client.user.id)
          .eq("friend_id", friendId)
          .single();

        if (existing) {
          send(ws, { type: "error", message: "Already friends" });
          break;
        }

        // Add bidirectional friendship
        await supabase.from("blip_friends").insert([
          { user_id: client.user.id, friend_id: friendId },
          { user_id: friendId, friend_id: client.user.id }
        ]);

        // Get friend details
        const { data: { user: friendUser } } = await supabase.auth.admin.getUserById(friendId);
        const friendIsOnline = fluxClients.has(friendId);

        const newFriend = {
          id: friendId,
          email: friendUser?.email,
          displayName: friendUser?.email?.split("@")[0] || "User",
          isOnline: friendIsOnline
        };

        send(ws, { type: "friend_added", friend: newFriend });

        // Notify the other user if online
        const friendClient = fluxClients.get(friendId);
        if (friendClient) {
          send(friendClient.ws, {
            type: "friend_added",
            friend: {
              id: client.user.id,
              email: client.user.email,
              displayName: client.user.email?.split("@")[0] || "User",
              isOnline: true
            }
          });
        }
        break;

      // ========== WebRTC Signaling ==========
      case "rtc_session_request":
        // Initiator wants to establish P2P connection with peer
        const targetPeer = fluxClients.get(data.peerId);
        if (!targetPeer) {
          send(ws, { type: "error", message: "Peer not connected" });
          break;
        }

        // Create session
        rtcSessions.set(data.sessionId, {
          initiatorId: client.user.id,
          responderId: data.peerId,
          state: "pending",
          createdAt: Date.now()
        });

        // Forward request to peer
        send(targetPeer.ws, {
          type: "rtc_session_request",
          senderId: client.user.id,
          senderName: client.user.email?.split("@")[0] || "User",
          sessionId: data.sessionId
        });
        break;

      case "rtc_session_accept":
        const acceptSession = rtcSessions.get(data.sessionId);
        if (!acceptSession) {
          send(ws, { type: "error", message: "Session not found" });
          break;
        }

        acceptSession.state = "accepted";

        // Notify initiator
        const initiator = fluxClients.get(acceptSession.initiatorId);
        if (initiator) {
          send(initiator.ws, {
            type: "rtc_session_accept",
            sessionId: data.sessionId,
            senderId: client.user.id
          });
        }
        break;

      case "rtc_session_reject":
        const rejectSession = rtcSessions.get(data.sessionId);
        if (rejectSession) {
          const rejectInitiator = fluxClients.get(rejectSession.initiatorId);
          if (rejectInitiator) {
            send(rejectInitiator.ws, {
              type: "rtc_session_reject",
              sessionId: data.sessionId,
              reason: data.reason || "Rejected by peer"
            });
          }
          rtcSessions.delete(data.sessionId);
        }
        break;

      case "rtc_offer":
        // Relay SDP offer to peer
        const offerPeer = fluxClients.get(data.peerId);
        if (offerPeer) {
          send(offerPeer.ws, {
            type: "rtc_offer",
            senderId: client.user.id,
            senderName: client.user.email?.split("@")[0] || "User",
            sessionId: data.sessionId,
            sdp: data.sdp
          });
        }
        break;

      case "rtc_answer":
        // Relay SDP answer to peer
        const answerPeer = fluxClients.get(data.peerId);
        if (answerPeer) {
          send(answerPeer.ws, {
            type: "rtc_answer",
            senderId: client.user.id,
            sessionId: data.sessionId,
            sdp: data.sdp
          });
        }
        break;

      case "rtc_ice_candidate":
        // Relay ICE candidate to peer
        const icePeer = fluxClients.get(data.peerId);
        if (icePeer) {
          send(icePeer.ws, {
            type: "rtc_ice_candidate",
            senderId: client.user.id,
            sessionId: data.sessionId,
            candidate: data.candidate,
            sdpMid: data.sdpMid,
            sdpMLineIndex: data.sdpMLineIndex
          });
        }
        break;

      case "rtc_session_ready":
        // P2P connection established
        const readySession = rtcSessions.get(data.sessionId);
        if (readySession) {
          readySession.state = "connected";

          // Notify the other peer
          const otherPeerId = readySession.initiatorId === client.user.id
            ? readySession.responderId
            : readySession.initiatorId;

          const otherPeer = fluxClients.get(otherPeerId);
          if (otherPeer) {
            send(otherPeer.ws, {
              type: "rtc_session_ready",
              sessionId: data.sessionId,
              senderId: client.user.id
            });
          }
        }
        break;

      case "rtc_session_close":
        const closeSession = rtcSessions.get(data.sessionId);
        if (closeSession) {
          // Notify the other peer
          const closePeerId = closeSession.initiatorId === client.user.id
            ? closeSession.responderId
            : closeSession.initiatorId;

          const closePeer = fluxClients.get(closePeerId);
          if (closePeer) {
            send(closePeer.ws, {
              type: "rtc_session_close",
              sessionId: data.sessionId
            });
          }

          rtcSessions.delete(data.sessionId);
        }
        break;

      default:
        console.log(`[FLUX] Unknown message type: ${data.type}`);
    }
  } catch (error) {
    console.error("[FLUX] Message handling error:", error);
    send(ws, { type: "error", message: "Internal error" });
  }
}

// ============================================================================
// TUS UPLOAD SERVER
// ============================================================================

const tusServer = new Server({
  path: "/upload",
  datastore: new FileStore({ directory: "/var/graphite/uploads" }),
  maxSize: 10 * 1024 * 1024 * 1024,
  respectForwardedHeaders: true,

  async onUploadCreate(req, res, upload) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw { status_code: 401, body: "Unauthorized" };
    }

    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (!user) {
      throw { status_code: 401, body: "Invalid token" };
    }

    upload.metadata = upload.metadata || {};
    upload.metadata.userId = user.id;
    return res;
  },

  async onUploadFinish(req, res, upload) {
    try {
      const userId = upload.metadata?.userId;
      const filename = upload.metadata?.filename || "unnamed";
      const mimeType = upload.metadata?.filetype || "application/octet-stream";
      const size = upload.size;

      if (!userId) {
        console.error("No userId in upload metadata");
        return res;
      }

      const userDir = path.join("/var/graphite/storage", userId);
      await fs.mkdir(userDir, { recursive: true });

      const fileId = randomUUID();
      const storagePath = path.join(userDir, fileId);
      const uploadPath = path.join("/var/graphite/uploads", upload.id);

      await fs.rename(uploadPath, storagePath);
      try { await fs.unlink(uploadPath + ".json"); } catch (e) {}

      await pool.query(
        "INSERT INTO files (id, user_id, name, size, mime_type, storage_path, type) VALUES ($1, $2, $3, $4, $5, $6, 'file') RETURNING *",
        [fileId, userId, filename, size, mimeType, storagePath]
      );

      await pool.query(
        "UPDATE users SET storage_used = storage_used + $1 WHERE id = $2",
        [size, userId]
      );

      console.log("File uploaded:", filename, "(", size, "bytes ) by", userId);
      return res;
    } catch (error) {
      console.error("Upload finish error:", error);
      return res;
    }
  }
});

// TUS OPTIONS handlers
app.options("/upload", (req, res) => {
  res.set({
    "Tus-Resumable": "1.0.0",
    "Tus-Version": "1.0.0",
    "Tus-Max-Size": "10737418240",
    "Tus-Extension": "creation,creation-with-upload,creation-defer-length,termination,expiration",
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, HEAD, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Upload-Length, Upload-Metadata, Upload-Offset, Tus-Resumable, Upload-Concat, Upload-Defer-Length, X-Requested-With, X-HTTP-Method-Override",
    "Access-Control-Expose-Headers": "Upload-Offset, Location, Upload-Length, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Upload-Metadata",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true"
  });
  res.status(204).end();
});

app.options("/upload/*", (req, res) => {
  res.set({
    "Tus-Resumable": "1.0.0",
    "Tus-Version": "1.0.0",
    "Tus-Max-Size": "10737418240",
    "Tus-Extension": "creation,creation-with-upload,creation-defer-length,termination,expiration",
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, HEAD, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Upload-Length, Upload-Metadata, Upload-Offset, Tus-Resumable, Upload-Concat, Upload-Defer-Length, X-Requested-With, X-HTTP-Method-Override",
    "Access-Control-Expose-Headers": "Upload-Offset, Location, Upload-Length, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Upload-Metadata",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true"
  });
  res.status(204).end();
});

// TUS routes
app.post("/upload", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Expose-Headers", "Upload-Offset, Upload-Length, Upload-Metadata, Location, Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size");
  tusServer.handle(req, res);
});

app.all("/upload/*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Expose-Headers", "Upload-Offset, Upload-Length, Upload-Metadata, Location, Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size");
  tusServer.handle(req, res);
});

// ============================================================================
// REST API
// ============================================================================

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://graphite.atxcopy.com",
    "https://www.graphite.atxcopy.com",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  exposedHeaders: ["Upload-Offset", "Upload-Length", "Upload-Metadata", "Location", "Tus-Resumable", "Tus-Version", "Tus-Extension", "Tus-Max-Size"]
}));

app.use(express.json());

// Auth middleware
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization" });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = user.id;

    await pool.query(
      "INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2",
      [user.id, user.email]
    );

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    fluxClients: fluxClients.size,
    rtcSessions: rtcSessions.size
  });
});

// Protected API routes
app.use("/api", authMiddleware);

// List files
app.get("/api/files", async (req, res) => {
  try {
    const { starred, deleted, parent_id } = req.query;

    let query = "SELECT * FROM files WHERE user_id = $1";
    const params = [req.userId];
    let paramIndex = 2;

    if (deleted === "true") {
      query += " AND is_deleted = true";
    } else {
      query += " AND is_deleted = false";
    }

    if (starred === "true") {
      query += " AND starred = true";
    }

    if (parent_id === "null" || parent_id === undefined || parent_id === "") {
      query += " AND parent_id IS NULL";
    } else if (parent_id) {
      query += " AND parent_id = $" + paramIndex;
      params.push(parent_id);
      paramIndex++;
    }

    query += " ORDER BY type DESC, created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("List files error:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// Get recent files
app.get("/api/files/recent", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM files WHERE user_id = $1 AND is_deleted = false AND type = 'file' ORDER BY created_at DESC LIMIT 20",
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Recent files error:", error);
    res.status(500).json({ error: "Failed to get recent files" });
  }
});

// Get single file
app.get("/api/files/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to get file" });
  }
});

// Download file
app.get("/api/files/:id/download", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = result.rows[0];
    res.setHeader("Content-Disposition", "attachment; filename=\"" + file.name + "\"");
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Content-Length", file.size);

    const stream = await fs.open(file.storage_path, "r");
    const readStream = stream.createReadStream();
    readStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Update file
app.patch("/api/files/:id", async (req, res) => {
  try {
    const { starred, name } = req.body;
    const updates = [];
    const params = [req.params.id, req.userId];
    let paramIndex = 3;

    if (starred !== undefined) {
      updates.push("starred = $" + paramIndex);
      params.push(starred);
      paramIndex++;
    }

    if (name !== undefined) {
      updates.push("name = $" + paramIndex);
      params.push(name);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = NOW()");

    const result = await pool.query(
      "UPDATE files SET " + updates.join(", ") + " WHERE id = $1 AND user_id = $2 RETURNING *",
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update file" });
  }
});

// Delete file (permanent)
app.delete("/api/files/:id", async (req, res) => {
  try {
    // Get file first to get storage path and size
    const fileResult = await pool.query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = fileResult.rows[0];

    // Delete from storage
    if (file.storage_path) {
      try {
        await fs.unlink(file.storage_path);
      } catch (e) {
        console.error("Failed to delete file from storage:", e);
      }
    }

    // Delete from database
    await pool.query(
      "DELETE FROM files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );

    // Update storage used
    if (file.size) {
      await pool.query(
        "UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2",
        [file.size, req.userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Create folder
app.post("/api/folders", async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    const result = await pool.query(
      "INSERT INTO files (user_id, name, type, parent_id) VALUES ($1, $2, 'folder', $3) RETURNING *",
      [req.userId, name, parent_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// Get storage info
app.get("/api/storage", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT storage_used, storage_limit, plan FROM users WHERE id = $1",
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ used: 0, limit: 107374182400, plan: "creator" });
    }

    const user = result.rows[0];
    res.json({
      used: parseInt(user.storage_used),
      limit: parseInt(user.storage_limit),
      plan: user.plan
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get storage info" });
  }
});

// ============================================================================
// START SERVER WITH WEBSOCKET
// ============================================================================

const server = http.createServer(app);

// Create WebSocket server for Flux signaling
const wss = new WebSocketServer({ server, path: "/flux" });

wss.on("connection", async (ws, req) => {
  try {
    // Extract token from query params
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    // Verify token
    const user = await verifyToken(token);
    if (!user) {
      ws.close(4001, "Invalid token");
      return;
    }

    console.log(`[FLUX] Connected: ${user.email}`);

    // Store client
    const client = { ws, user, connectedAt: Date.now() };
    fluxClients.set(user.id, client);

    // Send connected message
    send(ws, { type: "connected", userId: user.id, email: user.email });

    // Notify friends
    notifyFriendsOfStatus(user.id, true);

    // Handle messages
    ws.on("message", (message) => {
      handleFluxMessage(ws, client, message.toString());
    });

    // Handle close
    ws.on("close", () => {
      console.log(`[FLUX] Disconnected: ${user.email}`);
      fluxClients.delete(user.id);
      notifyFriendsOfStatus(user.id, false);

      // Clean up any sessions this user was part of
      rtcSessions.forEach((session, sessionId) => {
        if (session.initiatorId === user.id || session.responderId === user.id) {
          rtcSessions.delete(sessionId);
        }
      });
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`[FLUX] WebSocket error for ${user.email}:`, error);
    });

  } catch (error) {
    console.error("[FLUX] Connection error:", error);
    ws.close(4000, "Connection failed");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Graphite server running on port ${PORT}`);
  console.log(`TUS upload endpoint: http://0.0.0.0:${PORT}/upload`);
  console.log(`API endpoint: http://0.0.0.0:${PORT}/api`);
  console.log(`Flux WebSocket: ws://0.0.0.0:${PORT}/flux`);
});
