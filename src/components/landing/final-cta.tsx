"use client";

import { SignUpButton, SignedIn, SignedOut } from "@/components/auth/auth-wrapper";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl glass glass-border p-12 md:p-20 text-center">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/3 rounded-full bg-accent/10 blur-3xl animate-glow-pulse" />
            <div className="absolute bottom-0 left-0 h-96 w-96 translate-y-1/2 -translate-x-1/3 rounded-full bg-accent/5 blur-3xl animate-glow-pulse" style={{ animationDelay: "2s" }} />
          </div>

          {/* Grid pattern */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-serif tracking-tight">
              Ready to stop{" "}
              <span className="italic text-gradient">waiting?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-lg text-foreground-muted">
              Start your 14-day free trial. No credit card required.
            </p>

            <div className="mt-10">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="group relative px-10 py-5 text-sm font-medium overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-500 hover:shadow-2xl hover:shadow-accent/30 hover:scale-[1.02]">
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started — Free Trial
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="group relative inline-flex px-10 py-5 text-sm font-medium overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-500 hover:shadow-2xl hover:shadow-accent/30 hover:scale-[1.02]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Go to Dashboard
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
