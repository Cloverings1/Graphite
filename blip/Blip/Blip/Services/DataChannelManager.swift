//
//  DataChannelManager.swift
//  Blip
//
//  File transfer protocol over WebRTC DataChannels
//

import Foundation
import CryptoKit

// MARK: - Transfer Message Types

enum TransferMessageType: UInt8 {
    case fileMetadata = 1
    case fileChunk = 2
    case fileComplete = 3
    case transferAck = 4
    case transferSuccess = 5
    case transferFailed = 6
    case transferCancel = 7
}

// MARK: - File Metadata

struct FileMetadata: Codable {
    let transferId: String
    let fileName: String
    let fileSize: Int64
    let fileType: String
    let totalChunks: Int
    let checksum: String  // SHA256 of entire file
}

// MARK: - Transfer State

enum TransferState {
    case idle
    case sendingMetadata
    case sending(progress: Double)
    case receiving(progress: Double)
    case verifying
    case completed
    case failed(String)
    case cancelled
}

// MARK: - Transfer Progress

struct TransferProgress {
    let transferId: String
    let bytesTransferred: Int64
    let totalBytes: Int64
    let speed: Double  // bytes per second
    let state: TransferState

    var progress: Double {
        guard totalBytes > 0 else { return 0 }
        return Double(bytesTransferred) / Double(totalBytes)
    }

    var remainingTime: TimeInterval? {
        guard speed > 0, totalBytes > bytesTransferred else { return nil }
        return Double(totalBytes - bytesTransferred) / speed
    }
}

// MARK: - Delegate Protocol

protocol DataChannelManagerDelegate: AnyObject {
    func dataChannelManager(_ manager: DataChannelManager, didStartReceiving metadata: FileMetadata)
    func dataChannelManager(_ manager: DataChannelManager, didUpdateProgress progress: TransferProgress)
    func dataChannelManager(_ manager: DataChannelManager, didCompleteTransfer transferId: String, fileURL: URL)
    func dataChannelManager(_ manager: DataChannelManager, didFailTransfer transferId: String, error: String)
    func dataChannelManager(_ manager: DataChannelManager, didCancelTransfer transferId: String)
}

// MARK: - Data Channel Manager

class DataChannelManager {

    // MARK: - Properties

    weak var delegate: DataChannelManagerDelegate?
    private weak var webRTCService: WebRTCService?

    // Sending state
    private var sendingTransferId: String?
    private var sendingFileData: Data?
    private var sendingMetadata: FileMetadata?
    private var sendingChunkIndex: Int = 0
    private var sendingStartTime: Date?
    private var sendingPaused: Bool = false

    // Receiving state
    private var receivingTransferId: String?
    private var receivingMetadata: FileMetadata?
    private var receivingChunks: [Int: Data] = [:]
    private var receivingBytesReceived: Int64 = 0
    private var receivingStartTime: Date?

    // Progress tracking
    private var lastProgressUpdate: Date = Date()
    private var lastBytesTransferred: Int64 = 0

    // Temp directory for received files
    private let tempDirectory: URL

    // MARK: - Initialization

    init(webRTCService: WebRTCService) {
        self.webRTCService = webRTCService

        // Create temp directory for received files
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent("GraphiteFlux", isDirectory: true)
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        self.tempDirectory = tempDir
    }

    // MARK: - Public Methods

    /// Start sending a file to the peer
    func sendFile(transferId: String, fileURL: URL) throws {
        guard let data = try? Data(contentsOf: fileURL) else {
            throw NSError(domain: "DataChannelManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to read file"])
        }

        // Calculate checksum
        let checksum = SHA256.hash(data: data).compactMap { String(format: "%02x", $0) }.joined()

        // Calculate total chunks
        let totalChunks = Int(ceil(Double(data.count) / Double(WebRTCConfig.chunkSize)))

        // Create metadata
        let metadata = FileMetadata(
            transferId: transferId,
            fileName: fileURL.lastPathComponent,
            fileSize: Int64(data.count),
            fileType: fileURL.pathExtension,
            totalChunks: totalChunks,
            checksum: checksum
        )

        // Store state
        sendingTransferId = transferId
        sendingFileData = data
        sendingMetadata = metadata
        sendingChunkIndex = 0
        sendingStartTime = Date()
        sendingPaused = false

        // Send metadata first
        sendMetadata(metadata)
    }

    /// Handle incoming data from WebRTC
    func handleIncomingData(_ data: Data, onChannel channelId: Int) {
        guard data.count > 0 else { return }

        let messageType = TransferMessageType(rawValue: data[0])

        switch messageType {
        case .fileMetadata:
            handleFileMetadata(data)
        case .fileChunk:
            handleFileChunk(data, channelId: channelId)
        case .fileComplete:
            handleFileComplete(data)
        case .transferAck:
            handleTransferAck(data)
        case .transferSuccess:
            handleTransferSuccess(data)
        case .transferFailed:
            handleTransferFailed(data)
        case .transferCancel:
            handleTransferCancel(data)
        case .none:
            print("Unknown message type: \(data[0])")
        }
    }

    /// Cancel the current transfer
    func cancelTransfer() {
        if let transferId = sendingTransferId ?? receivingTransferId {
            sendCancelMessage(transferId: transferId)
            cleanup()
            delegate?.dataChannelManager(self, didCancelTransfer: transferId)
        }
    }

    /// Resume sending after buffer was full
    func resumeSending() {
        guard sendingPaused else { return }
        sendingPaused = false
        sendNextChunks()
    }

    // MARK: - Private Methods - Sending

    private func sendMetadata(_ metadata: FileMetadata) {
        guard let jsonData = try? JSONEncoder().encode(metadata) else { return }

        var message = Data([TransferMessageType.fileMetadata.rawValue])
        message.append(jsonData)

        _ = webRTCService?.sendData(message, onChannel: 0)

        updateSendProgress()
    }

    private func sendNextChunks() {
        guard let fileData = sendingFileData,
              let metadata = sendingMetadata,
              !sendingPaused else { return }

        // Check if we should pause due to buffer being full
        if webRTCService?.shouldPauseSending() == true {
            sendingPaused = true
            return
        }

        // Send multiple chunks in parallel across channels
        let chunksToSend = min(WebRTCConfig.parallelChannels, metadata.totalChunks - sendingChunkIndex)

        for _ in 0..<chunksToSend {
            guard sendingChunkIndex < metadata.totalChunks else { break }

            let start = sendingChunkIndex * WebRTCConfig.chunkSize
            let end = min(start + WebRTCConfig.chunkSize, fileData.count)
            let chunkData = fileData.subdata(in: start..<end)

            sendChunk(index: sendingChunkIndex, data: chunkData)
            sendingChunkIndex += 1
        }

        updateSendProgress()

        // Check if all chunks sent
        if sendingChunkIndex >= metadata.totalChunks {
            sendCompleteMessage()
        } else {
            // Schedule next batch
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.001) { [weak self] in
                self?.sendNextChunks()
            }
        }
    }

    private func sendChunk(index: Int, data: Data) {
        // Message format: [type (1 byte)] [chunk index (4 bytes)] [data]
        var message = Data()
        message.append(TransferMessageType.fileChunk.rawValue)

        // Append chunk index as 4-byte big-endian
        var indexBigEndian = UInt32(index).bigEndian
        message.append(Data(bytes: &indexBigEndian, count: 4))

        // Append chunk data
        message.append(data)

        // Round-robin across channels
        _ = webRTCService?.sendDataRoundRobin(message, index: index)
    }

    private func sendCompleteMessage() {
        guard let metadata = sendingMetadata else { return }

        var message = Data([TransferMessageType.fileComplete.rawValue])

        // Include checksum for verification
        if let checksumData = metadata.checksum.data(using: .utf8) {
            message.append(checksumData)
        }

        _ = webRTCService?.sendData(message, onChannel: 0)
    }

    private func sendCancelMessage(transferId: String) {
        var message = Data([TransferMessageType.transferCancel.rawValue])
        if let idData = transferId.data(using: .utf8) {
            message.append(idData)
        }
        _ = webRTCService?.sendData(message, onChannel: 0)
    }

    private func updateSendProgress() {
        guard let metadata = sendingMetadata,
              let startTime = sendingStartTime else { return }

        let bytesTransferred = Int64(sendingChunkIndex * WebRTCConfig.chunkSize)
        let elapsed = Date().timeIntervalSince(startTime)
        let speed = elapsed > 0 ? Double(bytesTransferred) / elapsed : 0

        let progress = TransferProgress(
            transferId: metadata.transferId,
            bytesTransferred: min(bytesTransferred, metadata.fileSize),
            totalBytes: metadata.fileSize,
            speed: speed,
            state: .sending(progress: Double(sendingChunkIndex) / Double(metadata.totalChunks))
        )

        delegate?.dataChannelManager(self, didUpdateProgress: progress)
    }

    // MARK: - Private Methods - Receiving

    private func handleFileMetadata(_ data: Data) {
        guard data.count > 1 else { return }

        let jsonData = data.subdata(in: 1..<data.count)
        guard let metadata = try? JSONDecoder().decode(FileMetadata.self, from: jsonData) else {
            print("Failed to decode file metadata")
            return
        }

        receivingTransferId = metadata.transferId
        receivingMetadata = metadata
        receivingChunks.removeAll()
        receivingBytesReceived = 0
        receivingStartTime = Date()

        delegate?.dataChannelManager(self, didStartReceiving: metadata)

        // Send ACK
        sendAck(transferId: metadata.transferId)
    }

    private func handleFileChunk(_ data: Data, channelId: Int) {
        guard data.count > 5 else { return }

        // Parse chunk index (4 bytes, big-endian)
        let indexBytes = data.subdata(in: 1..<5)
        let index = indexBytes.withUnsafeBytes { $0.load(as: UInt32.self).bigEndian }

        // Extract chunk data
        let chunkData = data.subdata(in: 5..<data.count)

        // Store chunk
        receivingChunks[Int(index)] = chunkData
        receivingBytesReceived += Int64(chunkData.count)

        updateReceiveProgress()
    }

    private func handleFileComplete(_ data: Data) {
        guard let metadata = receivingMetadata else { return }

        // Extract expected checksum
        var expectedChecksum = ""
        if data.count > 1 {
            expectedChecksum = String(data: data.subdata(in: 1..<data.count), encoding: .utf8) ?? ""
        }

        // Reassemble file
        var fileData = Data()
        for i in 0..<metadata.totalChunks {
            guard let chunkData = receivingChunks[i] else {
                sendFailedMessage(transferId: metadata.transferId, reason: "Missing chunk \(i)")
                delegate?.dataChannelManager(self, didFailTransfer: metadata.transferId, error: "Missing chunk \(i)")
                cleanup()
                return
            }
            fileData.append(chunkData)
        }

        // Verify checksum
        let actualChecksum = SHA256.hash(data: fileData).compactMap { String(format: "%02x", $0) }.joined()

        if !expectedChecksum.isEmpty && actualChecksum != expectedChecksum {
            sendFailedMessage(transferId: metadata.transferId, reason: "Checksum mismatch")
            delegate?.dataChannelManager(self, didFailTransfer: metadata.transferId, error: "Checksum mismatch")
            cleanup()
            return
        }

        // Save to temp file
        let fileURL = tempDirectory.appendingPathComponent(metadata.fileName)
        do {
            try fileData.write(to: fileURL)
            sendSuccessMessage(transferId: metadata.transferId)
            delegate?.dataChannelManager(self, didCompleteTransfer: metadata.transferId, fileURL: fileURL)
        } catch {
            sendFailedMessage(transferId: metadata.transferId, reason: error.localizedDescription)
            delegate?.dataChannelManager(self, didFailTransfer: metadata.transferId, error: error.localizedDescription)
        }

        cleanup()
    }

    private func handleTransferAck(_ data: Data) {
        // Receiver acknowledged metadata, start sending chunks
        sendNextChunks()
    }

    private func handleTransferSuccess(_ data: Data) {
        guard let transferId = sendingTransferId else { return }

        let progress = TransferProgress(
            transferId: transferId,
            bytesTransferred: sendingMetadata?.fileSize ?? 0,
            totalBytes: sendingMetadata?.fileSize ?? 0,
            speed: 0,
            state: .completed
        )

        delegate?.dataChannelManager(self, didUpdateProgress: progress)
        cleanup()
    }

    private func handleTransferFailed(_ data: Data) {
        guard let transferId = sendingTransferId else { return }

        var reason = "Transfer failed"
        if data.count > 1 {
            reason = String(data: data.subdata(in: 1..<data.count), encoding: .utf8) ?? reason
        }

        delegate?.dataChannelManager(self, didFailTransfer: transferId, error: reason)
        cleanup()
    }

    private func handleTransferCancel(_ data: Data) {
        let transferId = sendingTransferId ?? receivingTransferId ?? ""
        delegate?.dataChannelManager(self, didCancelTransfer: transferId)
        cleanup()
    }

    private func sendAck(transferId: String) {
        var message = Data([TransferMessageType.transferAck.rawValue])
        if let idData = transferId.data(using: .utf8) {
            message.append(idData)
        }
        _ = webRTCService?.sendData(message, onChannel: 0)
    }

    private func sendSuccessMessage(transferId: String) {
        var message = Data([TransferMessageType.transferSuccess.rawValue])
        if let idData = transferId.data(using: .utf8) {
            message.append(idData)
        }
        _ = webRTCService?.sendData(message, onChannel: 0)
    }

    private func sendFailedMessage(transferId: String, reason: String) {
        var message = Data([TransferMessageType.transferFailed.rawValue])
        if let reasonData = reason.data(using: .utf8) {
            message.append(reasonData)
        }
        _ = webRTCService?.sendData(message, onChannel: 0)
    }

    private func updateReceiveProgress() {
        guard let metadata = receivingMetadata,
              let startTime = receivingStartTime else { return }

        let elapsed = Date().timeIntervalSince(startTime)
        let speed = elapsed > 0 ? Double(receivingBytesReceived) / elapsed : 0

        let progress = TransferProgress(
            transferId: metadata.transferId,
            bytesTransferred: receivingBytesReceived,
            totalBytes: metadata.fileSize,
            speed: speed,
            state: .receiving(progress: Double(receivingBytesReceived) / Double(metadata.fileSize))
        )

        delegate?.dataChannelManager(self, didUpdateProgress: progress)
    }

    private func cleanup() {
        sendingTransferId = nil
        sendingFileData = nil
        sendingMetadata = nil
        sendingChunkIndex = 0
        sendingStartTime = nil
        sendingPaused = false

        receivingTransferId = nil
        receivingMetadata = nil
        receivingChunks.removeAll()
        receivingBytesReceived = 0
        receivingStartTime = nil
    }
}
