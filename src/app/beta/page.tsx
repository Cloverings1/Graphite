"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/icons/logo";

const TALLY_FORM_URL = "https://tally.so/r/BzdXO4";

// ============================================================================
// NAVBAR
// ============================================================================
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "py-3" : "py-6"}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className={`flex items-center justify-between rounded-2xl px-6 py-3 transition-all duration-500 ${scrolled ? "glass glass-border" : ""}`}>
          <Link href="/beta" className="flex items-center">
            <Logo />
          </Link>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-foreground-muted hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-sm text-foreground-muted hover:text-foreground transition-colors hidden sm:block">Pricing</a>
            <a
              href={TALLY_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all"
            >
              Request Access
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// HERO WITH LIVE UPLOAD SIMULATION
// ============================================================================
function Hero() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [fileSize] = useState(5.2); // GB
  const [isUploading, setIsUploading] = useState(true);

  useEffect(() => {
    if (!isUploading) return;

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          setTimeout(() => {
            setUploadProgress(0);
            setIsUploading(true);
          }, 2000);
          setIsUploading(false);
          return 100;
        }
        return prev + 0.8;
      });
      // Fluctuate speed realistically between 820-940 Mbps
      setUploadSpeed(820 + Math.random() * 120);
    }, 50);

    return () => clearInterval(interval);
  }, [isUploading]);

  const uploadedGB = ((uploadProgress / 100) * fileSize).toFixed(2);
  const timeRemaining = uploadProgress < 100
    ? Math.ceil(((100 - uploadProgress) / 100) * 59)
    : 0;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-b from-white/[0.03] to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        {/* Overline */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-sm text-foreground-muted">Now accepting early access requests</span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif tracking-tight leading-[0.9] mb-6">
          Stop waiting for
          <br />
          <span className="italic bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">your uploads.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-12">
          Cloud storage that uses your full internet speed.
          <br className="hidden sm:block" />
          <span className="text-foreground">No throttling. No limits.</span> Just fast.
        </p>

        {/* Live Upload Simulation */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 sm:p-8">
            {/* File info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">project_final_4k.mov</p>
                  <p className="text-sm text-foreground-muted">{fileSize} GB video file</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                  {uploadSpeed.toFixed(0)} <span className="text-sm font-normal text-foreground-muted">Mbps</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 rounded-full bg-white/5 overflow-hidden mb-4">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 transition-all duration-100"
                style={{ width: `${uploadProgress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">
                {uploadedGB} GB / {fileSize} GB
              </span>
              <span className="text-foreground-muted">
                {uploadProgress >= 100 ? (
                  <span className="text-emerald-400">Complete!</span>
                ) : (
                  `${timeRemaining}s remaining`
                )}
              </span>
            </div>
          </div>

          {/* Comparison callout */}
          <p className="mt-6 text-sm text-foreground-muted">
            This would take <span className="text-white font-medium">47 minutes</span> on Dropbox.
            <br />
            On Graphite? <span className="text-emerald-400 font-medium">Under 60 seconds.</span>
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={TALLY_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group px-8 py-4 text-sm font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all flex items-center gap-2"
          >
            Request Early Access
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a href="#features" className="px-8 py-4 text-sm text-foreground-muted hover:text-foreground transition-colors">
            See how it works
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}

// ============================================================================
// BENTO GRID FEATURES
// ============================================================================
function BentoFeatures() {
  return (
    <section id="features" className="py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-serif mb-4">
            Built different.
          </h2>
          <p className="text-foreground-muted text-lg max-w-xl mx-auto">
            Not another cloud storage. A transfer engine designed for people who actually work with large files.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Large feature - Speed */}
          <div className="lg:col-span-2 lg:row-span-2 rounded-3xl border border-white/10 bg-white/[0.02] p-8 sm:p-10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-medium mb-6">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                Core Technology
              </div>
              <h3 className="text-3xl sm:text-4xl font-serif mb-4">
                60x faster than Dropbox
              </h3>
              <p className="text-foreground-muted text-lg mb-8 max-w-lg">
                While competitors throttle you to 15 Mbps, we let you use your entire connection. Parallel chunked uploads, intelligent retry, zero artificial limits.
              </p>

              {/* Speed comparison visual */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm text-foreground-muted">Dropbox</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full w-[2%] rounded-full bg-white/20" />
                  </div>
                  <span className="text-sm text-foreground-muted">15 Mbps</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm text-foreground-muted">Google Drive</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div className="h-full w-[2%] rounded-full bg-white/20" />
                  </div>
                  <span className="text-sm text-foreground-muted">15 Mbps</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium">Graphite</span>
                  <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
                  </div>
                  <span className="text-sm font-medium text-emerald-400">940+ Mbps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resume on failure */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Resume on failure</h3>
              <p className="text-foreground-muted text-sm">
                Connection dropped at 92%? Pick up exactly where you left off. No restart required.
              </p>
            </div>
          </div>

          {/* NVMe Storage */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">NVMe storage</h3>
              <p className="text-foreground-muted text-sm">
                Enterprise-grade SSDs. No spinning disks, no bottlenecks. Pure speed.
              </p>
            </div>
          </div>

          {/* Share links */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Instant sharing</h3>
              <p className="text-foreground-muted text-sm">
                Generate download links in one click. Password protection and expiry dates included.
              </p>
            </div>
          </div>

          {/* Texas datacenter */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Dallas, Texas</h3>
              <p className="text-foreground-muted text-sm">
                Your files, stored on dedicated hardware in Dallas. Low latency, high performance.
              </p>
            </div>
          </div>

          {/* No bloat */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Zero bloat</h3>
              <p className="text-foreground-muted text-sm">
                No "smart sync." No AI features. No collaboration tools. Just fast, reliable storage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// GRAPHITE FLUX SECTION
// ============================================================================
function FluxSection() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-b from-violet-500/10 to-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-violet-300">Graphite Flux</span>
              <span className="text-xs text-foreground-muted">Prime & Reserve</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-serif mb-6">
              Peer-to-peer.
              <br />
              <span className="italic text-violet-300">No cloud required.</span>
            </h2>

            <p className="text-lg text-foreground-muted mb-8">
              Flux is Graphite's high-performance transfer engine. Send files directly to anyone, anywhere. Parallel streams, intelligent chunking, zero throttling.
            </p>

            <ul className="space-y-4 mb-8">
              {[
                "Direct device-to-device transfers",
                "Saturate your full connection speed",
                "Resume interrupted transfers instantly",
                "End-to-end encrypted",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-foreground-muted">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted">
              Available with Prime and Reserve plans. macOS app included.
            </p>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-8 relative overflow-hidden">
              {/* Transfer visualization */}
              <div className="flex items-center justify-between mb-8">
                {/* Device 1 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-foreground-muted">Your Mac</span>
                </div>

                {/* Transfer stream */}
                <div className="flex-1 mx-6 relative h-8">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-px bg-gradient-to-r from-violet-500/50 via-fuchsia-500 to-violet-500/50" />
                  </div>
                  {/* Animated particles */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="absolute w-8 h-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-stream-particle"
                        style={{ animationDelay: `${i * 0.3}s` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Device 2 */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-foreground-muted">Their Mac</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-white/[0.03]">
                  <p className="text-2xl font-mono font-bold text-emerald-400">847</p>
                  <p className="text-xs text-foreground-muted">Mbps</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03]">
                  <p className="text-2xl font-mono font-bold">4</p>
                  <p className="text-xs text-foreground-muted">Streams</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03]">
                  <p className="text-2xl font-mono font-bold text-violet-400">E2E</p>
                  <p className="text-xs text-foreground-muted">Encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PRICING
// ============================================================================
function Pricing() {
  const plans = [
    {
      name: "Core",
      price: 199,
      storage: "500 GB",
      features: [
        "Full-speed parallel uploads",
        "Resume on failure",
        "Shareable download links",
        "30-day retention",
        "Email support",
      ],
      popular: true,
      available: true,
    },
    {
      name: "Prime",
      price: 299,
      storage: "750 GB",
      features: [
        "Everything in Core",
        "Graphite Flux included",
        "Priority I/O",
        "60-day retention",
        "Priority support",
      ],
      flux: true,
      available: false,
    },
    {
      name: "Reserve",
      price: 449,
      storage: "1 TB",
      features: [
        "Everything in Prime",
        "Graphite Flux Pro",
        "Maximum throughput",
        "Pinned projects",
        "White-glove support",
      ],
      flux: true,
      available: false,
    },
  ];

  return (
    <section id="pricing" className="py-32 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-serif mb-4">
            Simple pricing.
          </h2>
          <p className="text-foreground-muted text-lg">
            No hidden fees. No per-GB transfer charges. Unlimited bandwidth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border p-8 ${
                plan.popular
                  ? "border-white/20 bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              } ${!plan.available ? "opacity-60" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-black text-xs font-medium">
                  Available Now
                </div>
              )}

              {plan.flux && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
                  Coming Soon
                </div>
              )}

              <h3 className="text-xl font-medium mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-serif">${plan.price}</span>
                <span className="text-foreground-muted">/mo</span>
              </div>

              <p className="text-sm text-foreground-muted mb-6">
                {plan.storage} NVMe storage
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-foreground-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.available ? TALLY_FORM_URL : undefined}
                target={plan.available ? "_blank" : undefined}
                rel={plan.available ? "noopener noreferrer" : undefined}
                className={`block w-full py-3 rounded-full text-center text-sm font-medium transition-all ${
                  plan.popular
                    ? "bg-white text-black hover:bg-white/90"
                    : plan.available
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white/5 text-foreground-muted cursor-not-allowed"
                }`}
              >
                {plan.available ? "Request Access" : "Coming Soon"}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted mt-8">
          All plans include unlimited bandwidth. No transfer fees.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ
// ============================================================================
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "How is Graphite faster than Dropbox?",
      a: "Dropbox and Google Drive artificially throttle uploads to 10-15 Mbps, regardless of your connection speed. Graphite uses parallel chunked uploads with zero throttling, letting you use your full bandwidth. If you have gigabit, you'll actually use it.",
    },
    {
      q: "Where is my data stored?",
      a: "Your files are stored on dedicated NVMe servers in Dallas, Texas. We don't scatter your data across anonymous cloud regions. You know exactly where your files are.",
    },
    {
      q: "Is there a file size limit?",
      a: "No artificial limits. Upload files up to 10GB each. Our resumable upload protocol means even massive files upload reliably.",
    },
    {
      q: "What is Graphite Flux?",
      a: "Flux is our peer-to-peer transfer engine for sending files directly to other Graphite users. It uses parallel streams and intelligent chunking to saturate your connection. Available with Prime and Reserve plans.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No contracts, no cancellation fees. Your data remains accessible for 30 days after cancellation to give you time to download everything.",
    },
  ];

  return (
    <section className="py-32">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-4xl sm:text-5xl font-serif text-center mb-16">
          Questions?
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <span className="font-medium">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-foreground-muted transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-foreground-muted">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================
function FinalCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full bg-gradient-to-t from-white/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-serif mb-6">
          Ready to stop
          <br />
          <span className="italic">waiting?</span>
        </h2>
        <p className="text-xl text-foreground-muted mb-12">
          Join the waitlist for early access.
        </p>
        <a
          href={TALLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-10 py-5 text-lg font-medium rounded-full bg-white text-black hover:bg-white/90 transition-all"
        >
          Request Early Access
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
  return (
    <footer className="py-12 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm text-foreground-muted">Your files, faster.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground-muted">
            <Link href="/" className="hover:text-foreground transition-colors">Main Site</Link>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
            <span>© 2025 Graphite</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// PAGE
// ============================================================================
export default function BetaPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <BentoFeatures />
      <FluxSection />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
