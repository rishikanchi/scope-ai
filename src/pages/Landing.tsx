import { useNavigate } from "react-router-dom";
import {
  Layers, GitBranch, FileText, MessageSquare, Mail, Database,
  ArrowRight, Zap, Eye, PenTool, Play, Command
} from "lucide-react";
import { Button } from "@/components/ui/button";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const integrations: { name: IntegrationType; icon: typeof Layers; desc: string }[] = [
  { name: "Linear", icon: Layers, desc: "Issue tracking" },
  { name: "GitHub", icon: GitBranch, desc: "Code & PRs" },
  { name: "Notion", icon: FileText, desc: "Documentation" },
  { name: "Slack", icon: MessageSquare, desc: "Team chat" },
  { name: "Gmail", icon: Mail, desc: "Email threads" },
  { name: "Supabase", icon: Database, desc: "Backend data" },
];

const stages = [
  { name: "Synthesis", icon: Eye, desc: "Cluster raw signals into actionable insight groups automatically." },
  { name: "Drafting", icon: PenTool, desc: "Write specifications with live data context from every integration." },
  { name: "Orchestration", icon: Play, desc: "Stage and execute actions across all connected services at once." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Command className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Scope</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>Pricing</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Log in</Button>
          <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-mono-data text-muted-foreground mb-6">
            <span className="signal-dot signal-dot-green" />
            v1.0 — Now in Beta
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            The Operating System<br />
            <span className="text-gradient">for Product Managers</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Synthesize signals, draft specs, and orchestrate execution across Linear, GitHub, Notion, Slack, Gmail & Supabase — all from one unified workspace.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="glow-primary px-8" onClick={() => navigate("/auth")}>
              Start Building <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
              View Plans
            </Button>
          </div>
        </div>
      </section>

      {/* Stages */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Three stages. One workflow.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {stages.map((s, i) => (
              <div key={s.name} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-mono-data text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Six integrations. Zero context-switching.</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Connect the tools your team already uses and let Scope unify them.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {integrations.map((int) => (
              <div key={int.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <int.icon className={`w-5 h-5 ${integrationColors[int.name]}`} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${integrationColors[int.name]}`}>{int.name}</div>
                  <div className="text-xs text-muted-foreground">{int.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto rounded-xl border border-primary/20 bg-card p-12 text-center glow-primary">
          <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Ready to ship faster?</h2>
          <p className="text-muted-foreground mb-6">Join the beta and get early access to the PM operating system.</p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Command className="w-3 h-3 text-primary-foreground" />
            </div>
            <span>Scope</span>
          </div>
          <span>© 2026 Scope. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
