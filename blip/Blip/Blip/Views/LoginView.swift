//
//  LoginView.swift
//  Blip
//

import SwiftUI

struct LoginView: View {
    @ObservedObject var authService = AuthService.shared

    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false

    var body: some View {
        VStack(spacing: 32) {
            // Logo
            VStack(spacing: 8) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.purple, .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                Text("Graphite Flux")
                    .font(.system(size: 28, weight: .bold, design: .rounded))

                Text("High-speed file transfer")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 24)

            // Form
            VStack(spacing: 16) {
                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .disableAutocorrection(true)

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(isSignUp ? .newPassword : .password)

                if let error = authService.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task {
                        if isSignUp {
                            await authService.signUp(email: email, password: password)
                        } else {
                            await authService.signIn(email: email, password: password)
                        }
                    }
                } label: {
                    if authService.isLoading {
                        ProgressView()
                            .controlSize(.small)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text(isSignUp ? "Create Account" : "Sign In")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(
                    LinearGradient(
                        colors: [.purple, .pink],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .disabled(email.isEmpty || password.isEmpty || authService.isLoading)
            }
            .padding(.horizontal, 24)

            // Toggle sign up / sign in
            Button {
                isSignUp.toggle()
                authService.error = nil
            } label: {
                Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)

            Spacer()

            // Footer
            Text("Part of Graphite")
                .font(.caption2)
                .foregroundColor(.secondary)
                .padding(.bottom, 16)
        }
        .frame(width: 320, height: 480)
    }
}

#Preview {
    LoginView()
}
