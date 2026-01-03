import { pricingTiers } from "@/data/pricing-tiers";
import { Check } from "lucide-react";

const TALLY_FORM_URL = "https://tally.so/r/BzdXO4";

export function Pricing() {
  return (
    <section className="py-32 relative overflow-visible">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 relative z-10 overflow-visible">
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
        <div className="grid gap-6 md:grid-cols-3 pt-8 overflow-visible">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 transition-all duration-500 overflow-visible ${
                tier.disabled
                  ? "glass glass-border opacity-60"
                  : tier.popular
                  ? "glass border border-accent/30 shadow-lg shadow-accent/5 hover-shine"
                  : "glass glass-border hover-shine"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {tier.popular && (
                <div className="absolute top-6 right-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium tracking-wider uppercase">
                    <span className="h-1 w-1 rounded-full bg-accent-foreground animate-glow-pulse" />
                    Popular
                  </span>
                </div>
              )}

              {tier.disabled && (
                <div className="absolute top-6 right-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-border/50 text-muted text-xs font-medium tracking-wider uppercase">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Tier Name */}
              <h3 className="text-lg font-medium tracking-tight">{tier.name}</h3>

              {/* Price */}
              <div className="mt-6">
                <span className="text-5xl font-serif tracking-tight">${tier.price}</span>
                <span className="text-foreground-muted ml-1">/ month</span>
              </div>

              {/* Storage details */}
              <div className="mt-8 pt-8 border-t border-border/50 space-y-3">
                <div className="text-sm">
                  <div className="text-foreground-muted mb-1">Storage</div>
                  <div className="font-medium">{tier.storage} active NVMe workspace</div>
                </div>
                <div className="text-sm">
                  <div className="text-foreground-muted mb-1">Upload Performance</div>
                  <div className={`font-medium ${tier.disabled ? "text-muted" : "text-accent"}`}>
                    {tier.speed}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-foreground-muted mb-1">Retention</div>
                  <div className="font-medium">{tier.transfer}</div>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <div className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
                      tier.disabled ? "bg-border/50" : "bg-success/10"
                    }`}>
                      <Check className={`h-3 w-3 ${tier.disabled ? "text-muted" : "text-success"}`} strokeWidth={2.5} />
                    </div>
                    <span className="text-foreground-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Flux Features */}
              {tier.fluxFeatures && tier.fluxFeatures.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-5 w-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-foreground">Graphite Flux</span>
                    <span className="text-xs text-muted">High-performance transfer engine</span>
                  </div>
                  <ul className="space-y-2">
                    {tier.fluxFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded flex items-center justify-center ${
                          tier.disabled ? "bg-border/30" : "bg-violet-500/10"
                        }`}>
                          <Check className={`h-2.5 w-2.5 ${tier.disabled ? "text-muted" : "text-violet-400"}`} strokeWidth={2.5} />
                        </div>
                        <span className="text-foreground-muted text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className="mt-8">
                {tier.disabled ? (
                  <div className="group relative">
                    <button
                      disabled
                      className="w-full py-3.5 px-6 rounded-full text-sm font-medium bg-border/30 text-muted cursor-not-allowed"
                    >
                      {tier.cta}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {tier.disabledReason || "Coming Soon"}
                    </div>
                  </div>
                ) : (
                  <a
                    href={TALLY_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-3.5 px-6 rounded-full text-sm font-medium text-center transition-all duration-300 ${
                      tier.popular
                        ? "bg-accent text-accent-foreground hover:shadow-lg hover:shadow-accent/20"
                        : "bg-border/50 text-foreground hover:bg-border"
                    }`}
                  >
                    {tier.cta}
                  </a>
                )}
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
          Designed for active project workflows. Not intended for long-term archival or backup storage.
        </p>
      </div>
    </section>
  );
}
