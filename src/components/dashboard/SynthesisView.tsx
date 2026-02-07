import { MessageSquare, Layers, GitBranch, Mail, FileText, Database, AlertTriangle } from "lucide-react";

type Source = { icon: typeof MessageSquare; label: string; text: string };

interface Cluster {
  title: string;
  count: number;
  severity: "high" | "medium" | "low";
  signals: Source[];
}

const clusters: Cluster[] = [
  {
    title: "Login Failure Reports",
    count: 12,
    severity: "high",
    signals: [
      { icon: MessageSquare, label: "Slack", text: "Users reporting 500 errors on /auth endpoint" },
      { icon: Layers, label: "Linear", text: "ENG-412: OAuth redirect loop on mobile" },
      { icon: GitBranch, label: "GitHub", text: "PR #89: Fix session token expiry logic" },
      { icon: Mail, label: "Gmail", text: "Customer: 'Can't log in since yesterday'" },
    ],
  },
  {
    title: "Performance Degradation",
    count: 8,
    severity: "medium",
    signals: [
      { icon: Database, label: "Supabase", text: "Query latency p99 increased 340ms" },
      { icon: MessageSquare, label: "Slack", text: "#infra: RDS CPU at 78% during peak" },
      { icon: Layers, label: "Linear", text: "ENG-398: Investigate slow dashboard load" },
    ],
  },
  {
    title: "Feature Request: Dark Mode",
    count: 6,
    severity: "low",
    signals: [
      { icon: MessageSquare, label: "Slack", text: "#product: Multiple dark mode requests" },
      { icon: Mail, label: "Gmail", text: "Enterprise client: Dark mode for accessibility" },
      { icon: FileText, label: "Notion", text: "Design system doc updated with dark palette" },
    ],
  },
  {
    title: "API v3 Migration Issues",
    count: 5,
    severity: "medium",
    signals: [
      { icon: GitBranch, label: "GitHub", text: "Issue #201: Breaking change in /users endpoint" },
      { icon: Layers, label: "Linear", text: "ENG-420: Update SDK for v3 compatibility" },
    ],
  },
  {
    title: "Onboarding Drop-off",
    count: 4,
    severity: "high",
    signals: [
      { icon: Database, label: "Supabase", text: "signup_funnel: 62% drop at step 3" },
      { icon: FileText, label: "Notion", text: "User research: Confusion at integration setup" },
    ],
  },
];

const severityColor = { high: "signal-dot-red", medium: "signal-dot-yellow", low: "signal-dot-green" };

export default function SynthesisView() {
  return (
    <div className="p-4 h-full overflow-auto">
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {clusters.map((cluster) => (
          <div key={cluster.title} className="break-inside-avoid rounded-lg border border-border bg-card p-4">
            {/* Cluster Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`signal-dot ${severityColor[cluster.severity]}`} />
                <h3 className="text-sm font-semibold leading-tight">{cluster.title}</h3>
              </div>
              <span className="text-[10px] font-mono-data text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {cluster.count}
              </span>
            </div>

            {/* Signal Items */}
            <div className="space-y-2">
              {cluster.signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <sig.icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono-data text-muted-foreground">{sig.label}</span>
                    <p className="text-xs leading-tight mt-0.5">{sig.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
