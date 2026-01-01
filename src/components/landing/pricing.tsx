"use client";

import { pricingTiers } from "@/data/pricing-tiers";
import { Check } from "lucide-react";
import { SignUpButton, SignedIn, SignedOut } from "@/components/auth/auth-wrapper";
import Link from "next/link";

export function Pricing() {
  return (
    <section className="py-32 relative">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        {/* Header */}
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight">
            Simple <span className="italic text-gradient">pricing</span>
          </h2>
          <p className="mt-4 text-lg text-foreground-muted">
            No hidden fees. No per-GB transfer charges.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 transition-all duration-500 hover-shine ${
                tier.popular
                  ? "glass border border-accent/30 shadow-lg shadow-accent/5"
                  : "glass glass-border"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium tracking-wider uppercase">
                    <span className="h-1 w-1 rounded-full bg-accent-foreground animate-glow-pulse" />
                    Popular
                  </span>
                </div>
              )}

              {/* Tier Name */}
              <h3 className="text-lg font-medium tracking-tight">{tier.name}</h3>

              {/* Price */}
              <div className="mt-6">
                <span className="text-5xl font-serif tracking-tight">${tier.price}</span>
                <span className="text-foreground-muted ml-1">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted">
                ${tier.annualPrice}/mo billed annually
              </p>

              {/* Storage details */}
              <div className="mt-8 pt-8 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Storage</span>
                  <span className="font-medium">{tier.storage}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Speed</span>
                  <span className="font-medium text-accent">{tier.speed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Transfer</span>
                  <span className="font-medium">{tier.transfer}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Users</span>
                  <span className="font-medium">{tier.users}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-success" strokeWidth={2.5} />
                    </div>
                    <span className="text-foreground-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-8">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button
                      className={`w-full py-3.5 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                        tier.popular
                          ? "bg-accent text-accent-foreground hover:shadow-lg hover:shadow-accent/20"
                          : "bg-border/50 text-foreground hover:bg-border"
                      }`}
                    >
                      {tier.cta}
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className={`block w-full py-3.5 px-6 rounded-full text-sm font-medium text-center transition-all duration-300 ${
                      tier.popular
                        ? "bg-accent text-accent-foreground hover:shadow-lg hover:shadow-accent/20"
                        : "bg-border/50 text-foreground hover:bg-border"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </SignedIn>
              </div>

              {/* Popular tier glow */}
              {tier.popular && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-16 text-center text-sm text-muted">
          All plans include unlimited transfer, full speed, drag & drop uploads,
          file sharing, and 14-day free trial.
        </p>
      </div>
    </section>
  );
}
