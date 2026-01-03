//
//  MainView.swift
//  Blip
//

import SwiftUI
import UniformTypeIdentifiers

struct MainView: View {
    @ObservedObject var authService = AuthService.shared
    @ObservedObject var blipService = BlipService.shared

    @State private var showAddFriend = false
    @State private var addFriendCode = ""
    @State private var showCodeCopied = false
    @State private var selectedFriend: Friend?
    @State private var isDropTargeted = false

    var body: some View {
        NavigationSplitView {
            // Sidebar - Friend List
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Graphite Flux")
                            .font(.headline)
                        HStack(spacing: 4) {
                            Circle()
                                .fill(blipService.isConnected ? .green : .red)
                                .frame(width: 6, height: 6)
                            Text(blipService.isConnected ? "Connected" : "Disconnected")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    Button {
                        showAddFriend = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                    .buttonStyle(.borderless)
                    .help("Add Friend")
                }
                .padding()

                Divider()

                // Friends List
                if blipService.friends.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.2")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                        Text("No friends yet")
                            .font(.headline)
                        Text("Share your connect code or\nadd a friend to get started")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                } else {
                    List(blipService.friends, selection: $selectedFriend) { friend in
                        FriendRow(friend: friend)
                            .tag(friend)
                    }
                    .listStyle(.sidebar)
                }

                Divider()

                // Connect Code Section
                VStack(spacing: 8) {
                    Text("Your Connect Code")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack {
                        if let code = blipService.connectCode {
                            Text(code)
                                .font(.system(.title2, design: .monospaced, weight: .bold))
                                .tracking(4)
                        } else {
                            ProgressView()
                                .controlSize(.small)
                        }

                        Button {
                            if let code = blipService.connectCode {
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(code, forType: .string)
                                showCodeCopied = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    showCodeCopied = false
                                }
                            }
                        } label: {
                            Image(systemName: showCodeCopied ? "checkmark" : "doc.on.doc")
                        }
                        .buttonStyle(.borderless)
                        .foregroundColor(showCodeCopied ? .green : .secondary)
                    }
                }
                .padding()

                Divider()

                // User & Sign Out
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(authService.currentUser?.email ?? "")
                            .font(.caption)
                            .lineLimit(1)
                    }

                    Spacer()

                    Button("Sign Out") {
                        blipService.disconnect()
                        authService.signOut()
                    }
                    .buttonStyle(.borderless)
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .frame(minWidth: 220)
        } detail: {
            // Main Content
            if let friend = selectedFriend {
                FriendDetailView(friend: friend)
            } else {
                DropZoneView()
            }
        }
        .sheet(isPresented: $showAddFriend) {
            AddFriendSheet(code: $addFriendCode) {
                blipService.addFriend(code: addFriendCode)
                addFriendCode = ""
                showAddFriend = false
            }
        }
        .alert("Incoming Transfer", isPresented: .init(
            get: { blipService.pendingIncomingSession != nil },
            set: { if !$0 { blipService.rejectIncomingSession() } }
        )) {
            Button("Accept") {
                blipService.acceptIncomingSession()
            }
            Button("Decline", role: .cancel) {
                blipService.rejectIncomingSession()
            }
        } message: {
            if let session = blipService.pendingIncomingSession {
                let sizeStr = ByteCountFormatter.string(fromByteCount: session.fileSize ?? 0, countStyle: .file)
                Text("\(session.peerName) wants to send you \"\(session.fileName ?? "file")\" (\(sizeStr))")
            }
        }
        .onAppear {
            blipService.connect()
        }
        .onDisappear {
            blipService.disconnect()
        }
    }
}

// MARK: - Friend Row

struct FriendRow: View {
    let friend: Friend

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 36, height: 36)

                Text(friend.displayName.prefix(1).uppercased())
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)

                // Online indicator
                Circle()
                    .fill(friend.isOnline ? .green : .gray)
                    .frame(width: 10, height: 10)
                    .overlay(
                        Circle()
                            .stroke(.background, lineWidth: 2)
                    )
                    .offset(x: 12, y: 12)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(friend.displayName)
                    .font(.system(size: 13, weight: .medium))

                Text(friend.isOnline ? "Online" : "Offline")
                    .font(.caption2)
                    .foregroundColor(friend.isOnline ? .green : .secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Add Friend Sheet

struct AddFriendSheet: View {
    @Binding var code: String
    let onAdd: () -> Void

    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Text("Add Friend")
                .font(.headline)

            Text("Enter your friend's connect code")
                .font(.subheadline)
                .foregroundColor(.secondary)

            TextField("Connect Code", text: $code)
                .textFieldStyle(.roundedBorder)
                .font(.system(.title3, design: .monospaced))
                .multilineTextAlignment(.center)
                .onChange(of: code) { _, newValue in
                    code = newValue.uppercased()
                }

            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)

                Button("Add Friend") {
                    onAdd()
                }
                .buttonStyle(.borderedProminent)
                .disabled(code.count < 6)
            }
        }
        .padding(24)
        .frame(width: 300)
    }
}

// MARK: - Drop Zone View

struct DropZoneView: View {
    @ObservedObject var blipService = BlipService.shared
    @State private var isTargeted = false

    var body: some View {
        VStack(spacing: 24) {
            if blipService.activeTransfers.isEmpty {
                // Empty state
                VStack(spacing: 16) {
                    Image(systemName: "arrow.down.doc")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)

                    Text("Select a friend to send files")
                        .font(.headline)

                    Text("Or drag files onto a friend in the sidebar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                // Active transfers
                Text("Transfers")
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)

                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(blipService.activeTransfers) { transfer in
                            TransferRow(transfer: transfer)
                        }
                    }
                    .padding()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8]))
                .foregroundColor(isTargeted ? .accentColor : .clear)
        )
        .padding()
    }
}

// MARK: - Friend Detail View

struct FriendDetailView: View {
    let friend: Friend
    @ObservedObject var blipService = BlipService.shared
    @State private var isTargeted = false

    var body: some View {
        VStack(spacing: 24) {
            // Friend info
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.purple, .pink],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)

                    Text(friend.displayName.prefix(1).uppercased())
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)
                }

                Text(friend.displayName)
                    .font(.title2)
                    .fontWeight(.semibold)

                HStack(spacing: 4) {
                    Circle()
                        .fill(friend.isOnline ? .green : .gray)
                        .frame(width: 8, height: 8)
                    Text(friend.isOnline ? "Online" : "Offline")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if friend.isOnline {
                // Drop zone for file
                VStack(spacing: 16) {
                    Image(systemName: "arrow.down.doc.fill")
                        .font(.system(size: 36))
                        .foregroundColor(isTargeted ? .accentColor : .secondary)

                    Text("Drop files here to send")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("or")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Button("Choose File...") {
                        openFilePicker()
                    }
                    .buttonStyle(.bordered)
                }
                .frame(maxWidth: 300, minHeight: 200)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.secondary.opacity(0.05))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8]))
                        .foregroundColor(isTargeted ? .accentColor : .secondary.opacity(0.3))
                )
                .onDrop(of: [.fileURL], isTargeted: $isTargeted) { providers in
                    handleDrop(providers: providers)
                    return true
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "wifi.slash")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("Friend is offline")
                        .font(.headline)
                    Text("They need to be online to receive files")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Transfers with this friend
            let friendTransfers = blipService.activeTransfers.filter { $0.peerId == friend.id }
            if !friendTransfers.isEmpty {
                Divider()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Transfers")
                        .font(.headline)

                    ForEach(friendTransfers) { transfer in
                        TransferRow(transfer: transfer)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Spacer()
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func openFilePicker() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true

        if panel.runModal() == .OK, let url = panel.url {
            blipService.sendFile(to: friend, fileURL: url)
        }
    }

    private func handleDrop(providers: [NSItemProvider]) {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, error in
                guard let data = item as? Data,
                      let url = URL(dataRepresentation: data, relativeTo: nil) else {
                    return
                }

                DispatchQueue.main.async {
                    blipService.sendFile(to: friend, fileURL: url)
                }
            }
        }
    }
}

// MARK: - Transfer Row

struct TransferRow: View {
    let transfer: FileTransfer
    @ObservedObject var blipService = BlipService.shared

    var body: some View {
        HStack(spacing: 12) {
            // File icon
            Image(systemName: transfer.direction == .incoming ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                .font(.title2)
                .foregroundColor(transfer.direction == .incoming ? .blue : .green)

            VStack(alignment: .leading, spacing: 4) {
                Text(transfer.fileName)
                    .font(.system(size: 13, weight: .medium))
                    .lineLimit(1)

                Text("\(transfer.formattedSize) \(transfer.direction == .incoming ? "from" : "to") \(transfer.peerName)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                // Progress
                switch transfer.status {
                case .pending:
                    Text("Waiting...")
                        .font(.caption2)
                        .foregroundColor(.orange)

                case .accepted:
                    Text("Accepted, starting...")
                        .font(.caption2)
                        .foregroundColor(.blue)

                case .inProgress(let progress):
                    ProgressView(value: progress)
                        .progressViewStyle(.linear)

                case .completed:
                    Text("Completed")
                        .font(.caption2)
                        .foregroundColor(.green)

                case .rejected:
                    Text("Declined")
                        .font(.caption2)
                        .foregroundColor(.red)

                case .cancelled:
                    Text("Cancelled")
                        .font(.caption2)
                        .foregroundColor(.secondary)

                case .failed(let reason):
                    Text("Failed: \(reason)")
                        .font(.caption2)
                        .foregroundColor(.red)
                }
            }

            Spacer()

            // Cancel button for in-progress transfers
            if case .inProgress = transfer.status {
                Button {
                    blipService.cancelTransfer(transfer.id)
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(12)
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(8)
    }
}

#Preview {
    MainView()
}
