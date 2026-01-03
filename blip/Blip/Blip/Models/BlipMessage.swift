//
//  BlipMessage.swift
//  Blip
//

import Foundation

// MARK: - Outgoing Messages

enum BlipOutgoingMessage: Encodable {
    // Connection & Friends
    case ping
    case getConnectCode
    case addFriend(code: String)
    case getFriends

    // WebRTC Signaling
    case rtcSessionRequest(peerId: String, sessionId: String, fileName: String?, fileSize: Int64?, fileType: String?)
    case rtcSessionAccept(peerId: String, sessionId: String)
    case rtcSessionReject(peerId: String, sessionId: String, reason: String?)
    case rtcOffer(peerId: String, sessionId: String, sdp: String)
    case rtcAnswer(peerId: String, sessionId: String, sdp: String)
    case rtcIceCandidate(peerId: String, sessionId: String, candidate: String, sdpMid: String?, sdpMLineIndex: Int32?)
    case rtcSessionReady(sessionId: String)
    case rtcSessionClose(sessionId: String)

    enum CodingKeys: String, CodingKey {
        case type, code, peerId, sessionId, sdp, candidate, sdpMid, sdpMLineIndex, reason
        case fileName, fileSize, fileType
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .ping:
            try container.encode("ping", forKey: .type)

        case .getConnectCode:
            try container.encode("get_connect_code", forKey: .type)

        case .addFriend(let code):
            try container.encode("add_friend", forKey: .type)
            try container.encode(code, forKey: .code)

        case .getFriends:
            try container.encode("get_friends", forKey: .type)

        // WebRTC Signaling
        case .rtcSessionRequest(let peerId, let sessionId, let fileName, let fileSize, let fileType):
            try container.encode("rtc_session_request", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encodeIfPresent(fileName, forKey: .fileName)
            try container.encodeIfPresent(fileSize, forKey: .fileSize)
            try container.encodeIfPresent(fileType, forKey: .fileType)

        case .rtcSessionAccept(let peerId, let sessionId):
            try container.encode("rtc_session_accept", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)

        case .rtcSessionReject(let peerId, let sessionId, let reason):
            try container.encode("rtc_session_reject", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encodeIfPresent(reason, forKey: .reason)

        case .rtcOffer(let peerId, let sessionId, let sdp):
            try container.encode("rtc_offer", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(sdp, forKey: .sdp)

        case .rtcAnswer(let peerId, let sessionId, let sdp):
            try container.encode("rtc_answer", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(sdp, forKey: .sdp)

        case .rtcIceCandidate(let peerId, let sessionId, let candidate, let sdpMid, let sdpMLineIndex):
            try container.encode("rtc_ice_candidate", forKey: .type)
            try container.encode(peerId, forKey: .peerId)
            try container.encode(sessionId, forKey: .sessionId)
            try container.encode(candidate, forKey: .candidate)
            try container.encodeIfPresent(sdpMid, forKey: .sdpMid)
            try container.encodeIfPresent(sdpMLineIndex, forKey: .sdpMLineIndex)

        case .rtcSessionReady(let sessionId):
            try container.encode("rtc_session_ready", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)

        case .rtcSessionClose(let sessionId):
            try container.encode("rtc_session_close", forKey: .type)
            try container.encode(sessionId, forKey: .sessionId)
        }
    }
}

// MARK: - Incoming Messages

struct BlipIncomingMessage: Decodable {
    let type: String

    // Connection
    let userId: String?
    let email: String?

    // Connect code
    let code: String?

    // Error
    let message: String?

    // Friends
    let friends: [Friend]?
    let friend: Friend?
    let friendId: String?

    // WebRTC Signaling
    let senderId: String?
    let senderName: String?
    let sessionId: String?
    let sdp: String?
    let candidate: String?
    let sdpMid: String?
    let sdpMLineIndex: Int32?
    let reason: String?

    // File Transfer Metadata (for session requests)
    let fileName: String?
    let fileSize: Int64?
    let fileType: String?
}
