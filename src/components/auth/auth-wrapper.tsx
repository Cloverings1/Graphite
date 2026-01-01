"use client";

import { ReactNode } from "react";
import {
  SignInButton as ClerkSignInButton,
  SignUpButton as ClerkSignUpButton,
  SignedIn as ClerkSignedIn,
  SignedOut as ClerkSignedOut,
  UserButton as ClerkUserButton,
  SignOutButton as ClerkSignOutButton,
} from "@clerk/nextjs";

// Check if Clerk is configured at runtime
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Wrapper components that fall back gracefully when Clerk is not configured
export function SignedOut({ children }: { children: ReactNode }) {
  if (!isClerkConfigured) {
    // When Clerk is not configured, always show "signed out" content
    return <>{children}</>;
  }
  return <ClerkSignedOut>{children}</ClerkSignedOut>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  if (!isClerkConfigured) {
    // When Clerk is not configured, never show "signed in" content
    return null;
  }
  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}

export function SignInButton({
  children,
  mode,
}: {
  children: ReactNode;
  mode?: "modal" | "redirect";
}) {
  if (!isClerkConfigured) {
    // When Clerk is not configured, just render the button without auth
    return <>{children}</>;
  }
  return <ClerkSignInButton mode={mode}>{children}</ClerkSignInButton>;
}

export function SignUpButton({
  children,
  mode,
}: {
  children: ReactNode;
  mode?: "modal" | "redirect";
}) {
  if (!isClerkConfigured) {
    // When Clerk is not configured, just render the button without auth
    return <>{children}</>;
  }
  return <ClerkSignUpButton mode={mode}>{children}</ClerkSignUpButton>;
}

export function UserButton({ afterSignOutUrl }: { afterSignOutUrl?: string }) {
  if (!isClerkConfigured) {
    return null;
  }
  return <ClerkUserButton afterSignOutUrl={afterSignOutUrl} />;
}

export function SignOutButton({
  children,
  redirectUrl,
}: {
  children: ReactNode;
  redirectUrl?: string;
}) {
  if (!isClerkConfigured) {
    return <>{children}</>;
  }
  return <ClerkSignOutButton redirectUrl={redirectUrl}>{children}</ClerkSignOutButton>;
}
