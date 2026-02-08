"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ArrowRight, Layers, GitBranch, FileText, MessageSquare, Mail, Database, Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/use-connections";

// ─── Pricing Step ──────────────────────────────────────────

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 Scope", "3 Integrations", "100 Signals/mo", "Community support"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    features: ["Unlimited Scopes", "All 6 Integrations", "Unlimited Signals", "AI Copilot", "Priority support"],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Everything in Pro", "SSO & SAML", "Dedicated instance", "Custom integrations", "SLA & onboarding"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

// ─── Integrations Step ──────────────────────────────────────

type IntegrationType = "linear" | "github" | "notion" | "slack" | "gmail" | "supabase";

const integrationColors: Record<IntegrationType, string> = {
  linear: "text-int-linear",
  github: "text-int-github",
  notion: "text-int-notion",
  slack: "text-int-slack",
  gmail: "text-int-gmail",
  supabase: "text-int-supabase",
};

const integrations: { key: IntegrationType; name: string; icon: typeof Layers; desc: string; hasOAuth: boolean }[] = [
  { key: "linear", name: "Linear", icon: Layers, desc: "Sync tickets, sprints, and project data", hasOAuth: true },
  { key: "github", name: "GitHub", icon: GitBranch, desc: "Access repos, PRs, issues, and diffs", hasOAuth: true },
  { key: "notion", name: "Notion", icon: FileText, desc: "Connect pages, databases, and docs", hasOAuth: true },
  { key: "slack", name: "Slack", icon: MessageSquare, desc: "Monitor channels and thread activity", hasOAuth: true },
  { key: "gmail", name: "Gmail", icon: Mail, desc: "Track emails and thread context", hasOAuth: true },
  { key: "supabase", name: "Supabase", icon: Database, desc: "Query tables and monitor functions", hasOAuth: false },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<"pricing" | "integrations">("pricing");
  const { connections, isLoading, connect, disconnect } = useConnections();

  const connectedCount = Object.keys(connections).length;

  if (step === "pricing") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/scope_logo.png" alt="Scope" width={28} height={28} className="rounded-md" />
            <span className="font-semibold text-lg">Scope</span>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-6 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-sm font-medium">Plan</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
              <span className="text-sm text-muted-foreground">Integrations</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold mt-8 mb-2">Choose your plan</h1>
          <p className="text-muted-foreground mb-10">Start free and scale as your team grows.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  plan.highlighted ? "border-primary bg-card glow-primary-sm" : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <span className="text-xs font-semibold text-primary mb-2">Most popular</span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-signal-green shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setStep("integrations")}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setStep("integrations")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now <ArrowRight className="w-3 h-3 inline ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Integrations Step ──────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/scope_logo.png" alt="Scope" width={28} height={28} className="rounded-md" />
          <span className="font-semibold text-lg">Scope</span>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-sm text-muted-foreground">Plan</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-sm font-medium">Integrations</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mt-8 mb-2">Connect your tools</h1>
        <p className="text-muted-foreground mb-8">
          Link the services Scope will monitor and act on. You can always change these later in Settings.
        </p>

        <div className="space-y-3">
          {integrations.map((int) => {
            const isConnected = !!connections[int.key];

            return (
              <div
                key={int.key}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isConnected
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <int.icon className={`w-5 h-5 ${integrationColors[int.key]}`} />
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${integrationColors[int.key]}`}>{int.name}</div>
                    <div className="text-xs text-muted-foreground">{int.desc}</div>
                    {isConnected && connections[int.key]?.metadata && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-data">
                        {formatMetadata(int.key, connections[int.key].metadata)}
                      </div>
                    )}
                  </div>
                </div>

                {isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => disconnect(int.key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : int.hasOAuth ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connect(int.key)}
                    className="gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Connect
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Auto-configured</span>
                )}
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep("pricing")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to plans
          </button>
          <Button onClick={() => router.push("/dashboard")} className="gap-2">
            {connectedCount > 0
              ? `Continue with ${connectedCount} integration${connectedCount !== 1 ? "s" : ""}`
              : "Continue to Dashboard"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You can connect or disconnect integrations anytime from Settings.
        </p>
      </div>
    </div>
  );
}

function formatMetadata(provider: string, metadata: Record<string, unknown>): string {
  switch (provider) {
    case "slack":
      return metadata.team_name ? `Workspace: ${metadata.team_name}` : "";
    case "notion":
      return metadata.workspace_name ? `Workspace: ${metadata.workspace_name}` : "";
    case "github":
      return metadata.login ? `@${metadata.login}` : "";
    default:
      return "";
  }
}
