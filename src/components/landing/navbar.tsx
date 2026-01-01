"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@/components/auth/auth-wrapper";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex h-14 items-center justify-between rounded-full glass glass-border px-6">
          <Link href="/" className="flex items-center opacity-0 animate-fade-in">
            <Logo />
          </Link>

          <div className="flex items-center gap-3 opacity-0 animate-fade-in delay-100">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors duration-300">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="group relative px-5 py-2.5 text-sm font-medium overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-300 hover:shadow-lg hover:shadow-accent/20">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors duration-300"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
}
