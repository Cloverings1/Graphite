//
//  WebRTCStub.swift
//  Blip
//
//  Temporary stub for WebRTC types until framework issues are resolved
//  DELETE THIS FILE once WebRTC package is working
//

import Foundation

// MARK: - Stub Types (Remove when real WebRTC works)

#if !canImport(WebRTC)

public class RTCPeerConnectionFactory {
    public init(encoderFactory: RTCDefaultVideoEncoderFactory, decoderFactory: RTCDefaultVideoDecoderFactory) {}

    public func peerConnection(with config: RTCConfiguration, constraints: RTCMediaConstraints, delegate: RTCPeerConnectionDelegate?) -> RTCPeerConnection? {
        return RTCPeerConnection()
    }
}

public class RTCDefaultVideoEncoderFactory {}
public class RTCDefaultVideoDecoderFactory {}

public func RTCInitializeSSL() {}

public class RTCConfiguration {
    public var iceServers: [RTCIceServer] = []
    public var iceTransportPolicy: RTCIceTransportPolicy = .all
    public var bundlePolicy: RTCBundlePolicy = .maxBundle
    public var rtcpMuxPolicy: RTCRtcpMuxPolicy = .require
    public var continualGatheringPolicy: RTCContinualGatheringPolicy = .gatherContinually
    public init() {}
}

public class RTCIceServer {
    public init(urlStrings: [String]) {}
}

public enum RTCIceTransportPolicy { case all }
public enum RTCBundlePolicy { case maxBundle }
public enum RTCRtcpMuxPolicy { case require }
public enum RTCContinualGatheringPolicy { case gatherContinually }

public class RTCMediaConstraints {
    public init(mandatoryConstraints: [String: String]?, optionalConstraints: [String: String]?) {}
}

public class RTCPeerConnection {
    public func dataChannel(forLabel label: String, configuration: RTCDataChannelConfiguration) -> RTCDataChannel? {
        return RTCDataChannel(label: label)
    }

    public func offer(for constraints: RTCMediaConstraints, completionHandler: @escaping (RTCSessionDescription?, Error?) -> Void) {
        completionHandler(RTCSessionDescription(type: .offer, sdp: "stub-offer"), nil)
    }

    public func answer(for constraints: RTCMediaConstraints, completionHandler: @escaping (RTCSessionDescription?, Error?) -> Void) {
        completionHandler(RTCSessionDescription(type: .answer, sdp: "stub-answer"), nil)
    }

    public func setLocalDescription(_ sdp: RTCSessionDescription, completionHandler: @escaping (Error?) -> Void) {
        completionHandler(nil)
    }

    public func setRemoteDescription(_ sdp: RTCSessionDescription, completionHandler: @escaping (Error?) -> Void) {
        completionHandler(nil)
    }

    public func add(_ candidate: RTCIceCandidate, completionHandler: @escaping (Error?) -> Void) {
        completionHandler(nil)
    }

    public func close() {}
}

public class RTCDataChannelConfiguration {
    public var isOrdered: Bool = true
    public var isNegotiated: Bool = false
    public var channelId: Int32 = 0
    public init() {}
}

public class RTCDataChannel {
    public let label: String
    public var delegate: RTCDataChannelDelegate?
    public var readyState: RTCDataChannelState = .open
    public var bufferedAmount: UInt64 = 0

    public init(label: String = "") {
        self.label = label
    }

    public func sendData(_ buffer: RTCDataBuffer) -> Bool {
        return true
    }

    public func close() {}
}

public enum RTCDataChannelState: Int {
    case connecting = 0
    case open = 1
    case closing = 2
    case closed = 3
}

public class RTCDataBuffer {
    public let data: Data
    public let isBinary: Bool

    public init(data: Data, isBinary: Bool) {
        self.data = data
        self.isBinary = isBinary
    }
}

public class RTCSessionDescription {
    public let type: RTCSdpType
    public let sdp: String

    public init(type: RTCSdpType, sdp: String) {
        self.type = type
        self.sdp = sdp
    }
}

public enum RTCSdpType: Int {
    case offer = 0
    case prAnswer = 1
    case answer = 2
    case rollback = 3
}

public class RTCIceCandidate {
    public let sdp: String
    public let sdpMLineIndex: Int32
    public let sdpMid: String?

    public init(sdp: String, sdpMLineIndex: Int32, sdpMid: String?) {
        self.sdp = sdp
        self.sdpMLineIndex = sdpMLineIndex
        self.sdpMid = sdpMid
    }
}

public enum RTCSignalingState: Int {
    case stable = 0
    case haveLocalOffer = 1
    case haveLocalPrAnswer = 2
    case haveRemoteOffer = 3
    case haveRemotePrAnswer = 4
    case closed = 5
}

public enum RTCIceConnectionState: Int {
    case new = 0
    case checking = 1
    case connected = 2
    case completed = 3
    case failed = 4
    case disconnected = 5
    case closed = 6
    case count = 7
}

public enum RTCIceGatheringState: Int {
    case new = 0
    case gathering = 1
    case complete = 2
}

public class RTCMediaStream {}

public protocol RTCPeerConnectionDelegate: AnyObject {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState)
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream)
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream)
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection)
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState)
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState)
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate)
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate])
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel)
}

public protocol RTCDataChannelDelegate: AnyObject {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel)
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer)
    func dataChannel(_ dataChannel: RTCDataChannel, didChangeBufferedAmount amount: UInt64)
}

#endif
