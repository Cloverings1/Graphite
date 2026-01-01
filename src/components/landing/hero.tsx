"use client";

import { SpeedDemo } from "./speed-demo";
import { SignUpButton, SignedIn, SignedOut } from "@/components/auth/auth-wrapper";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-b from-accent/8 to-transparent blur-3xl animate-glow-pulse" />
        <div className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full bg-accent/5 blur-3xl animate-glow-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        {/* Overline badge */}
        <div className="opacity-0 animate-fade-down">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass glass-border text-[11px] tracking-widest uppercase text-foreground-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-glow-pulse" />
            Cloud storage reimagined
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-serif tracking-tight opacity-0 animate-fade-up delay-100">
          Your files,{" "}
          <span className="italic text-gradient">faster.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-lg text-base md:text-lg text-foreground-muted leading-relaxed opacity-0 animate-fade-up delay-200">
          Cloud storage that actually uses your internet speed.
          <br className="hidden sm:block" />
          <span className="text-foreground">No throttling. No limits.</span> Just fast.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row opacity-0 animate-fade-up delay-300">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="group relative px-6 py-3 text-sm font-medium overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-500 hover:shadow-xl hover:shadow-accent/20 hover:scale-[1.02]">
                <span className="relative z-10 flex items-center gap-2">
                  Get Started — Free Trial
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="group relative px-6 py-3 text-sm font-medium overflow-hidden rounded-full bg-accent text-accent-foreground transition-all duration-500 hover:shadow-xl hover:shadow-accent/20 hover:scale-[1.02]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Go to Dashboard
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          </SignedIn>
          <a
            href="#speed"
            className="group flex items-center gap-2 px-4 py-3 text-sm text-foreground-muted hover:text-foreground transition-colors duration-300"
          >
            <span className="link-underline">See it in action</span>
            <span className="group-hover:translate-y-1 transition-transform duration-300">↓</span>
          </a>
        </div>

        {/* Speed Demo */}
        <div className="mt-10 w-full max-w-md opacity-0 animate-scale-in delay-500">
          <SpeedDemo />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
