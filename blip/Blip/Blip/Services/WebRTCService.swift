//
//  WebRTCService.swift
//  Blip
//
//  WebRTC peer connection management for P2P file transfers
//

import Foundation

#if canImport(WebRTC)
import WebRTC
#endif

// MARK: - WebRTC Configuration

enum WebRTCConfig {
    static let stunServers = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302"
    ]

    // Chunk size for file transfers (64KB optimal for WebRTC)
    static let chunkSize = 64 * 1024

    // Number of parallel data channels for maximum throughput
    static let parallelChannels = 4

    // Buffer threshold to pause sending (16MB)
    static let bufferHighWatermark: UInt64 = 16 * 1024 * 1024

    // Buffer threshold to resume sending (4MB)
    static let bufferLowWatermark: UInt64 = 4 * 1024 * 1024
}

// MARK: - Session State

enum RTCSessionState {
    case idle
    case connecting
    case connected
    case transferring
    case disconnected
    case failed(Error)
}

// MARK: - WebRTC Delegate Protocol

protocol WebRTCServiceDelegate: AnyObject {
    func webRTCService(_ service: WebRTCService, didChangeState state: RTCSessionState)
    func webRTCService(_ service: WebRTCService, didGenerateLocalOffer sdp: String)
    func webRTCService(_ service: WebRTCService, didGenerateLocalAnswer sdp: String)
    func webRTCService(_ service: WebRTCService, didGenerateIceCandidate candidate: RTCIceCandidate)
    func webRTCService(_ service: WebRTCService, didReceiveData data: Data, onChannel channelId: Int)
    func webRTCService(_ service: WebRTCService, didOpenDataChannel channelId: Int)
    func webRTCService(_ service: WebRTCService, didCloseDataChannel channelId: Int)
}

// MARK: - WebRTC Service

class WebRTCService: NSObject {

    // MARK: - Properties

    weak var delegate: WebRTCServiceDelegate?

    private(set) var sessionId: String?
    private(set) var peerId: String?
    private(set) var state: RTCSessionState = .idle {
        didSet {
            delegate?.webRTCService(self, didChangeState: state)
        }
    }

    private var peerConnection: RTCPeerConnection?
    private var dataChannels: [Int: RTCDataChannel] = [:]
    private var pendingIceCandidates: [RTCIceCandidate] = []
    private var hasRemoteDescription = false

    // WebRTC factory (expensive to create, reuse)
    private static let factory: RTCPeerConnectionFactory = {
        RTCInitializeSSL()
        let videoEncoderFactory = RTCDefaultVideoEncoderFactory()
        let videoDecoderFactory = RTCDefaultVideoDecoderFactory()
        return RTCPeerConnectionFactory(
            encoderFactory: videoEncoderFactory,
            decoderFactory: videoDecoderFactory
        )
    }()

    // MARK: - Initialization

    override init() {
        super.init()
    }

    deinit {
        close()
    }

    // MARK: - Public Methods

    /// Start a new WebRTC session as the initiator (caller)
    func startSession(sessionId: String, peerId: String) {
        self.sessionId = sessionId
        self.peerId = peerId
        state = .connecting

        createPeerConnection()
        createDataChannels()
        createOffer()
    }

    /// Join an existing WebRTC session as the responder (callee)
    func joinSession(sessionId: String, peerId: String) {
        self.sessionId = sessionId
        self.peerId = peerId
        state = .connecting

        createPeerConnection()
        // Data channels will be created by the initiator and received via onDataChannel
    }

    /// Set remote SDP offer (for responder)
    func setRemoteOffer(_ sdp: String) {
        guard let peerConnection = peerConnection else { return }

        let sessionDescription = RTCSessionDescription(type: .offer, sdp: sdp)
        peerConnection.setRemoteDescription(sessionDescription) { [weak self] error in
            if let error = error {
                print("Error setting remote offer: \(error)")
                self?.state = .failed(error)
                return
            }

            self?.hasRemoteDescription = true
            self?.addPendingIceCandidates()
            self?.createAnswer()
        }
    }

    /// Set remote SDP answer (for initiator)
    func setRemoteAnswer(_ sdp: String) {
        guard let peerConnection = peerConnection else { return }

        let sessionDescription = RTCSessionDescription(type: .answer, sdp: sdp)
        peerConnection.setRemoteDescription(sessionDescription) { [weak self] error in
            if let error = error {
                print("Error setting remote answer: \(error)")
                self?.state = .failed(error)
                return
            }

            self?.hasRemoteDescription = true
            self?.addPendingIceCandidates()
        }
    }

    /// Add remote ICE candidate
    func addIceCandidate(_ candidateString: String, sdpMid: String?, sdpMLineIndex: Int32?) {
        let candidate = RTCIceCandidate(
            sdp: candidateString,
            sdpMLineIndex: sdpMLineIndex ?? 0,
            sdpMid: sdpMid
        )

        if hasRemoteDescription {
            peerConnection?.add(candidate) { error in
                if let error = error {
                    print("Error adding ICE candidate: \(error)")
                }
            }
        } else {
            // Queue candidate until remote description is set
            pendingIceCandidates.append(candidate)
        }
    }

    /// Send data on a specific channel
    func sendData(_ data: Data, onChannel channelId: Int) -> Bool {
        guard let channel = dataChannels[channelId],
              channel.readyState == .open else {
            return false
        }

        let buffer = RTCDataBuffer(data: data, isBinary: true)
        return channel.sendData(buffer)
    }

    /// Send data on the next available channel (round-robin)
    func sendDataRoundRobin(_ data: Data, index: Int) -> Bool {
        let channelId = index % WebRTCConfig.parallelChannels
        return sendData(data, onChannel: channelId)
    }

    /// Get the buffered amount for a channel
    func bufferedAmount(forChannel channelId: Int) -> UInt64 {
        return dataChannels[channelId]?.bufferedAmount ?? 0
    }

    /// Get total buffered amount across all channels
    func totalBufferedAmount() -> UInt64 {
        return dataChannels.values.reduce(0) { $0 + $1.bufferedAmount }
    }

    /// Check if we should pause sending (buffer too full)
    func shouldPauseSending() -> Bool {
        return totalBufferedAmount() > WebRTCConfig.bufferHighWatermark
    }

    /// Check if we can resume sending (buffer drained enough)
    func canResumeSending() -> Bool {
        return totalBufferedAmount() < WebRTCConfig.bufferLowWatermark
    }

    /// Close the WebRTC session
    func close() {
        for (_, channel) in dataChannels {
            channel.close()
        }
        dataChannels.removeAll()

        peerConnection?.close()
        peerConnection = nil

        sessionId = nil
        peerId = nil
        hasRemoteDescription = false
        pendingIceCandidates.removeAll()

        state = .disconnected
    }

    // MARK: - Private Methods

    private func createPeerConnection() {
        let config = RTCConfiguration()

        // Configure ICE servers (STUN for NAT traversal)
        config.iceServers = [RTCIceServer(urlStrings: WebRTCConfig.stunServers)]

        // Use all available ICE transport types
        config.iceTransportPolicy = .all

        // Bundle policy
        config.bundlePolicy = .maxBundle

        // RTCP mux policy
        config.rtcpMuxPolicy = .require

        // Continuous gathering for better connectivity
        config.continualGatheringPolicy = .gatherContinually

        // Create constraints
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )

        // Create peer connection
        peerConnection = Self.factory.peerConnection(
            with: config,
            constraints: constraints,
            delegate: self
        )
    }

    private func createDataChannels() {
        guard let peerConnection = peerConnection else { return }

        // Create multiple data channels for parallel transfers
        for i in 0..<WebRTCConfig.parallelChannels {
            let config = RTCDataChannelConfiguration()
            config.isOrdered = true  // Ordered delivery for file integrity
            config.isNegotiated = false
            config.channelId = Int32(i)

            if let channel = peerConnection.dataChannel(forLabel: "file-\(i)", configuration: config) {
                channel.delegate = self
                dataChannels[i] = channel
                print("Created data channel \(i)")
            }
        }
    }

    private func createOffer() {
        guard let peerConnection = peerConnection else { return }

        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio": "false",
                "OfferToReceiveVideo": "false"
            ],
            optionalConstraints: nil
        )

        peerConnection.offer(for: constraints) { [weak self] sdp, error in
            guard let self = self, let sdp = sdp else {
                print("Error creating offer: \(error?.localizedDescription ?? "unknown")")
                return
            }

            peerConnection.setLocalDescription(sdp) { error in
                if let error = error {
                    print("Error setting local description: \(error)")
                    return
                }

                self.delegate?.webRTCService(self, didGenerateLocalOffer: sdp.sdp)
            }
        }
    }

    private func createAnswer() {
        guard let peerConnection = peerConnection else { return }

        let constraints = RTCMediaConstraints(
            mandatoryConstraints: [
                "OfferToReceiveAudio": "false",
                "OfferToReceiveVideo": "false"
            ],
            optionalConstraints: nil
        )

        peerConnection.answer(for: constraints) { [weak self] sdp, error in
            guard let self = self, let sdp = sdp else {
                print("Error creating answer: \(error?.localizedDescription ?? "unknown")")
                return
            }

            peerConnection.setLocalDescription(sdp) { error in
                if let error = error {
                    print("Error setting local description: \(error)")
                    return
                }

                self.delegate?.webRTCService(self, didGenerateLocalAnswer: sdp.sdp)
            }
        }
    }

    private func addPendingIceCandidates() {
        for candidate in pendingIceCandidates {
            peerConnection?.add(candidate) { error in
                if let error = error {
                    print("Error adding pending ICE candidate: \(error)")
                }
            }
        }
        pendingIceCandidates.removeAll()
    }
}

// MARK: - RTCPeerConnectionDelegate

extension WebRTCService: RTCPeerConnectionDelegate {

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {
        print("Signaling state changed: \(stateChanged.rawValue)")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        // Not used for data-only connections
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        // Not used for data-only connections
    }

    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {
        print("Peer connection should negotiate")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("ICE connection state changed: \(newState.rawValue)")

        switch newState {
        case .connected, .completed:
            state = .connected
        case .disconnected:
            state = .disconnected
        case .failed:
            state = .failed(NSError(domain: "WebRTC", code: -1, userInfo: [NSLocalizedDescriptionKey: "ICE connection failed"]))
        case .closed:
            state = .disconnected
        default:
            break
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        print("ICE gathering state changed: \(newState.rawValue)")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        delegate?.webRTCService(self, didGenerateIceCandidate: candidate)
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {
        print("ICE candidates removed")
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        print("Data channel opened: \(dataChannel.label)")

        // Extract channel ID from label (e.g., "file-0" -> 0)
        if let idString = dataChannel.label.split(separator: "-").last,
           let channelId = Int(idString) {
            dataChannel.delegate = self
            dataChannels[channelId] = dataChannel
            delegate?.webRTCService(self, didOpenDataChannel: channelId)
        }
    }
}

// MARK: - RTCDataChannelDelegate

extension WebRTCService: RTCDataChannelDelegate {

    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        print("Data channel \(dataChannel.label) state: \(dataChannel.readyState.rawValue)")

        if let idString = dataChannel.label.split(separator: "-").last,
           let channelId = Int(idString) {

            switch dataChannel.readyState {
            case .open:
                delegate?.webRTCService(self, didOpenDataChannel: channelId)
            case .closed:
                delegate?.webRTCService(self, didCloseDataChannel: channelId)
            default:
                break
            }
        }
    }

    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        if let idString = dataChannel.label.split(separator: "-").last,
           let channelId = Int(idString) {
            delegate?.webRTCService(self, didReceiveData: buffer.data, onChannel: channelId)
        }
    }

    func dataChannel(_ dataChannel: RTCDataChannel, didChangeBufferedAmount amount: UInt64) {
        // Can be used for flow control
    }
}
