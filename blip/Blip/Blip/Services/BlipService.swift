//
//  BlipService.swift
//  Blip
//
//  Main service for Blip: WebSocket signaling + WebRTC P2P file transfers
//

import Foundation
import Combine
import AppKit

#if canImport(WebRTC)
import WebRTC
#endif

// MARK: - P2P Session

struct P2PSession {
    let sessionId: String
    let peerId: String
    let peerName: String
    let isInitiator: Bool
    let webRTCService: WebRTCService
    var dataChannelManager: DataChannelManager?
    var pendingFileURL: URL?
    var fileName: String?
    var fileSize: Int64?
    var fileType: String?
}

// MARK: - BlipService

@MainActor
class BlipService: ObservableObject {
    static let shared = BlipService()

    // MARK: - Published Properties

    @Published var isConnected = false
    @Published var connectCode: String?
    @Published var friends: [Friend] = []
    @Published var activeTransfers: [FileTransfer] = []
    @Published var pendingIncomingSession: P2PSession?
    @Published var error: String?
    @Published var currentTransferSpeed: Double = 0  // bytes per second

    // MARK: - Private Properties

    private var webSocket: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private let authService = AuthService.shared

    // Active P2P sessions (sessionId -> P2PSession)
    private var activeSessions: [String: P2PSession] = [:]

    // MARK: - Initialization

    private init() {}

    // MARK: - Connection Management

    func connect() {
        guard let token = authService.accessToken else {
            error = "Not authenticated"
            return
        }

        disconnect()

        let urlString = "\(Config.fluxWSURL)?token=\(token)"
        guard let url = URL(string: urlString) else {
            error = "Invalid URL"
            return
        }

        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()

        receiveMessage()
        startPingTimer()
    }

    func disconnect() {
        pingTimer?.invalidate()
        pingTimer = nil
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        isConnected = false

        // Close all active sessions
        for (_, session) in activeSessions {
            session.webRTCService.close()
        }
        activeSessions.removeAll()
    }

    private func startPingTimer() {
        pingTimer = Timer.scheduledTimer(withTimeInterval: 25, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.send(.ping)
            }
        }
    }

    // MARK: - WebSocket Receive

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self?.handleMessage(text)
                    case .data(let data):
                        if let text = String(data: data, encoding: .utf8) {
                            self?.handleMessage(text)
                        }
                    @unknown default:
                        break
                    }
                    self?.receiveMessage()

                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    self?.isConnected = false
                    // Attempt reconnect after delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        if self?.authService.isAuthenticated == true {
                            self?.connect()
                        }
                    }
                }
            }
        }
    }

    // MARK: - Message Handling

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let message = try? JSONDecoder().decode(BlipIncomingMessage.self, from: data) else {
            print("Failed to decode message: \(text)")
            return
        }

        switch message.type {
        // Connection
        case "connected":
            isConnected = true
            send(.getConnectCode)
            send(.getFriends)

        case "pong":
            break

        // Connect code
        case "connect_code":
            connectCode = message.code

        // Friends
        case "friends_list":
            friends = message.friends ?? []

        case "friend_added":
            if let friend = message.friend {
                friends.append(friend)
            }

        case "friend_online":
            if let friendId = message.friendId,
               let index = friends.firstIndex(where: { $0.id == friendId }) {
                friends[index].isOnline = true
            }

        case "friend_offline":
            if let friendId = message.friendId,
               let index = friends.firstIndex(where: { $0.id == friendId }) {
                friends[index].isOnline = false
            }

        // Errors
        case "error":
            error = message.message

        // WebRTC Signaling
        case "rtc_session_request":
            handleSessionRequest(message)

        case "rtc_session_accept":
            handleSessionAccept(message)

        case "rtc_session_reject":
            handleSessionReject(message)

        case "rtc_offer":
            handleRTCOffer(message)

        case "rtc_answer":
            handleRTCAnswer(message)

        case "rtc_ice_candidate":
            handleICECandidate(message)

        case "rtc_session_ready":
            handleSessionReady(message)

        case "rtc_session_close":
            handleSessionClose(message)

        default:
            print("Unknown message type: \(message.type)")
        }
    }

    // MARK: - Send Message

    func send(_ message: BlipOutgoingMessage) {
        guard let data = try? JSONEncoder().encode(message),
              let text = String(data: data, encoding: .utf8) else {
            return
        }

        webSocket?.send(.string(text)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }

    // MARK: - Friend Management

    func addFriend(code: String) {
        send(.addFriend(code: code.uppercased()))
    }

    // MARK: - WebRTC Session Handlers

    private func handleSessionRequest(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId,
              let senderId = message.senderId,
              let senderName = message.senderName else { return }

        // Create WebRTC service for this session (we're the responder)
        let webRTCService = WebRTCService()
        webRTCService.delegate = self

        let session = P2PSession(
            sessionId: sessionId,
            peerId: senderId,
            peerName: senderName,
            isInitiator: false,
            webRTCService: webRTCService,
            dataChannelManager: nil,
            pendingFileURL: nil,
            fileName: message.fileName,
            fileSize: message.fileSize,
            fileType: message.fileType
        )

        // Store as pending - user must accept
        pendingIncomingSession = session
    }

    private func handleSessionAccept(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId,
              var session = activeSessions[sessionId] else { return }

        // Peer accepted, start WebRTC connection as initiator
        session.webRTCService.startSession(sessionId: sessionId, peerId: session.peerId)
        activeSessions[sessionId] = session
    }

    private func handleSessionReject(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId else { return }

        // Peer rejected, clean up
        if let session = activeSessions[sessionId] {
            session.webRTCService.close()
            activeSessions.removeValue(forKey: sessionId)

            // Update transfer status
            if let index = activeTransfers.firstIndex(where: { $0.id == sessionId }) {
                activeTransfers[index].status = .rejected
            }
        }
    }

    private func handleRTCOffer(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId,
              let sdp = message.sdp,
              let session = activeSessions[sessionId] else { return }

        session.webRTCService.setRemoteOffer(sdp)
    }

    private func handleRTCAnswer(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId,
              let sdp = message.sdp,
              let session = activeSessions[sessionId] else { return }

        session.webRTCService.setRemoteAnswer(sdp)
    }

    private func handleICECandidate(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId,
              let candidate = message.candidate,
              let session = activeSessions[sessionId] else { return }

        session.webRTCService.addIceCandidate(
            candidate,
            sdpMid: message.sdpMid,
            sdpMLineIndex: message.sdpMLineIndex
        )
    }

    private func handleSessionReady(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId else { return }
        // Session is ready, data channels should be open
        print("Session \(sessionId) is ready for data transfer")
    }

    private func handleSessionClose(_ message: BlipIncomingMessage) {
        guard let sessionId = message.sessionId else { return }
        closeSession(sessionId)
    }

    // MARK: - File Transfer (WebRTC P2P)

    /// Send a file to a friend via WebRTC P2P
    func sendFile(to friend: Friend, fileURL: URL) {
        let sessionId = UUID().uuidString

        // Create WebRTC service
        let webRTCService = WebRTCService()
        webRTCService.delegate = self

        // Get file info
        let fileName = fileURL.lastPathComponent
        let fileType = fileURL.pathExtension
        let fileSize: Int64
        do {
            let attrs = try FileManager.default.attributesOfItem(atPath: fileURL.path)
            fileSize = attrs[.size] as? Int64 ?? 0
        } catch {
            self.error = "Could not read file: \(error.localizedDescription)"
            return
        }

        // Create session
        var session = P2PSession(
            sessionId: sessionId,
            peerId: friend.id,
            peerName: friend.displayName,
            isInitiator: true,
            webRTCService: webRTCService,
            dataChannelManager: nil,
            pendingFileURL: fileURL,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType
        )

        // Store session
        activeSessions[sessionId] = session

        // Create transfer record
        let transfer = FileTransfer(
            id: sessionId,
            direction: .outgoing,
            peerId: friend.id,
            peerName: friend.displayName,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType,
            status: .pending
        )
        activeTransfers.append(transfer)

        // Send session request via signaling
        send(.rtcSessionRequest(
            peerId: friend.id,
            sessionId: sessionId,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType
        ))
    }

    /// Accept an incoming P2P session
    func acceptIncomingSession() {
        guard var session = pendingIncomingSession else { return }

        // Join the session as responder
        session.webRTCService.joinSession(sessionId: session.sessionId, peerId: session.peerId)

        // Store in active sessions
        activeSessions[session.sessionId] = session
        pendingIncomingSession = nil

        // Create transfer record
        let transfer = FileTransfer(
            id: session.sessionId,
            direction: .incoming,
            peerId: session.peerId,
            peerName: session.peerName,
            fileName: session.fileName ?? "Unknown",
            fileSize: session.fileSize ?? 0,
            fileType: session.fileType ?? "",
            status: .inProgress(progress: 0)
        )
        activeTransfers.append(transfer)

        // Send accept via signaling
        send(.rtcSessionAccept(peerId: session.peerId, sessionId: session.sessionId))
    }

    /// Reject an incoming P2P session
    func rejectIncomingSession() {
        guard let session = pendingIncomingSession else { return }

        send(.rtcSessionReject(peerId: session.peerId, sessionId: session.sessionId, reason: "User declined"))
        session.webRTCService.close()
        pendingIncomingSession = nil
    }

    /// Cancel an active transfer
    func cancelTransfer(_ sessionId: String) {
        if let session = activeSessions[sessionId] {
            session.dataChannelManager?.cancelTransfer()
            send(.rtcSessionClose(sessionId: sessionId))
            closeSession(sessionId)
        }

        if let index = activeTransfers.firstIndex(where: { $0.id == sessionId }) {
            activeTransfers[index].status = .cancelled
        }
    }

    // MARK: - Session Management

    private func closeSession(_ sessionId: String) {
        if let session = activeSessions[sessionId] {
            session.webRTCService.close()
            activeSessions.removeValue(forKey: sessionId)
        }
    }

    private func startFileTransfer(for sessionId: String) {
        guard var session = activeSessions[sessionId],
              let fileURL = session.pendingFileURL else { return }

        // Create data channel manager
        let manager = DataChannelManager(webRTCService: session.webRTCService)
        manager.delegate = self
        session.dataChannelManager = manager
        activeSessions[sessionId] = session

        // Start sending file
        do {
            try manager.sendFile(transferId: sessionId, fileURL: fileURL)
        } catch {
            self.error = "Failed to start transfer: \(error.localizedDescription)"
            if let index = activeTransfers.firstIndex(where: { $0.id == sessionId }) {
                activeTransfers[index].status = .failed(reason: error.localizedDescription)
            }
        }
    }
}

// MARK: - WebRTCServiceDelegate

extension BlipService: WebRTCServiceDelegate {

    nonisolated func webRTCService(_ service: WebRTCService, didChangeState state: RTCSessionState) {
        Task { @MainActor in
            guard let sessionId = service.sessionId else { return }

            switch state {
            case .connected:
                print("WebRTC connected for session \(sessionId)")
                // Notify peer that session is ready
                send(.rtcSessionReady(sessionId: sessionId))

                // If we're the initiator, start file transfer
                if let session = activeSessions[sessionId], session.isInitiator {
                    startFileTransfer(for: sessionId)
                }

            case .disconnected, .failed:
                closeSession(sessionId)

            default:
                break
            }
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didGenerateLocalOffer sdp: String) {
        Task { @MainActor in
            guard let sessionId = service.sessionId,
                  let session = activeSessions[sessionId] else { return }

            send(.rtcOffer(peerId: session.peerId, sessionId: sessionId, sdp: sdp))
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didGenerateLocalAnswer sdp: String) {
        Task { @MainActor in
            guard let sessionId = service.sessionId,
                  let session = activeSessions[sessionId] else { return }

            send(.rtcAnswer(peerId: session.peerId, sessionId: sessionId, sdp: sdp))
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didGenerateIceCandidate candidate: RTCIceCandidate) {
        Task { @MainActor in
            guard let sessionId = service.sessionId,
                  let session = activeSessions[sessionId] else { return }

            send(.rtcIceCandidate(
                peerId: session.peerId,
                sessionId: sessionId,
                candidate: candidate.sdp,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex
            ))
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didReceiveData data: Data, onChannel channelId: Int) {
        Task { @MainActor in
            guard let sessionId = service.sessionId,
                  let session = activeSessions[sessionId] else { return }

            // Forward to data channel manager
            session.dataChannelManager?.handleIncomingData(data, onChannel: channelId)
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didOpenDataChannel channelId: Int) {
        Task { @MainActor in
            guard let sessionId = service.sessionId else { return }
            print("Data channel \(channelId) opened for session \(sessionId)")

            // If we're the responder and all channels are open, set up data channel manager
            if var session = activeSessions[sessionId], !session.isInitiator {
                if session.dataChannelManager == nil {
                    let manager = DataChannelManager(webRTCService: session.webRTCService)
                    manager.delegate = self
                    session.dataChannelManager = manager
                    activeSessions[sessionId] = session
                }
            }
        }
    }

    nonisolated func webRTCService(_ service: WebRTCService, didCloseDataChannel channelId: Int) {
        Task { @MainActor in
            guard let sessionId = service.sessionId else { return }
            print("Data channel \(channelId) closed for session \(sessionId)")
        }
    }
}

// MARK: - DataChannelManagerDelegate

extension BlipService: DataChannelManagerDelegate {

    nonisolated func dataChannelManager(_ manager: DataChannelManager, didStartReceiving metadata: FileMetadata) {
        Task { @MainActor in
            print("Started receiving: \(metadata.fileName) (\(metadata.fileSize) bytes)")

            if let index = activeTransfers.firstIndex(where: { $0.id == metadata.transferId }) {
                activeTransfers[index].status = .inProgress(progress: 0)
            }
        }
    }

    nonisolated func dataChannelManager(_ manager: DataChannelManager, didUpdateProgress progress: TransferProgress) {
        Task { @MainActor in
            currentTransferSpeed = progress.speed

            if let index = activeTransfers.firstIndex(where: { $0.id == progress.transferId }) {
                activeTransfers[index].bytesTransferred = progress.bytesTransferred

                switch progress.state {
                case .sending(let p), .receiving(let p):
                    activeTransfers[index].status = .inProgress(progress: p)
                case .completed:
                    activeTransfers[index].status = .completed
                case .failed(let reason):
                    activeTransfers[index].status = .failed(reason: reason)
                default:
                    break
                }
            }
        }
    }

    nonisolated func dataChannelManager(_ manager: DataChannelManager, didCompleteTransfer transferId: String, fileURL: URL) {
        Task { @MainActor in
            print("Transfer complete: \(fileURL.path)")

            if let index = activeTransfers.firstIndex(where: { $0.id == transferId }) {
                activeTransfers[index].status = .completed

                // Move to Downloads and open in Finder
                saveReceivedFile(tempURL: fileURL, transfer: activeTransfers[index])
            }

            // Close the session
            send(.rtcSessionClose(sessionId: transferId))
            closeSession(transferId)
        }
    }

    nonisolated func dataChannelManager(_ manager: DataChannelManager, didFailTransfer transferId: String, error: String) {
        Task { @MainActor in
            print("Transfer failed: \(error)")

            if let index = activeTransfers.firstIndex(where: { $0.id == transferId }) {
                activeTransfers[index].status = .failed(reason: error)
            }

            self.error = error
            closeSession(transferId)
        }
    }

    nonisolated func dataChannelManager(_ manager: DataChannelManager, didCancelTransfer transferId: String) {
        Task { @MainActor in
            print("Transfer cancelled")

            if let index = activeTransfers.firstIndex(where: { $0.id == transferId }) {
                activeTransfers[index].status = .cancelled
            }

            closeSession(transferId)
        }
    }

    // MARK: - File Saving

    private func saveReceivedFile(tempURL: URL, transfer: FileTransfer) {
        let downloadsURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first!
        var fileURL = downloadsURL.appendingPathComponent(transfer.fileName)

        // Handle duplicate names
        var counter = 1
        while FileManager.default.fileExists(atPath: fileURL.path) {
            let name = URL(fileURLWithPath: transfer.fileName).deletingPathExtension().lastPathComponent
            let ext = URL(fileURLWithPath: transfer.fileName).pathExtension
            fileURL = downloadsURL.appendingPathComponent("\(name) (\(counter)).\(ext)")
            counter += 1
        }

        do {
            try FileManager.default.moveItem(at: tempURL, to: fileURL)
            print("File saved to: \(fileURL.path)")
            // Open in Finder
            NSWorkspace.shared.selectFile(fileURL.path, inFileViewerRootedAtPath: "")
        } catch {
            self.error = "Failed to save file: \(error.localizedDescription)"
        }
    }
}
