import { MessageSquare, Layers, GitBranch, Mail, FileText, Database } from "lucide-react";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

type Source = { icon: typeof MessageSquare; label: IntegrationType; text: string };

interface Cluster {
  title: string;
  description: string;
  count: number;
  severity: "high" | "medium" | "low";
  signals: Source[];
}

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const clusters: Cluster[] = [
  {
    title: "Login Failure Reports",
    description: "Multiple users experiencing authentication failures, primarily on mobile Safari. Root cause appears to be OAuth redirect loop triggered after v2.4 deployment.",
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
    description: "Dashboard load times have increased significantly during peak hours. Database queries showing elevated latency and CPU utilization is higher than normal.",
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
    description: "Growing demand for dark mode support from both enterprise clients citing accessibility requirements and power users preferring reduced eye strain.",
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
    description: "Breaking changes in the new API version causing integration failures for partners. SDK updates needed for compatibility.",
    count: 5,
    severity: "medium",
    signals: [
      { icon: GitBranch, label: "GitHub", text: "Issue #201: Breaking change in /users endpoint" },
      { icon: Layers, label: "Linear", text: "ENG-420: Update SDK for v3 compatibility" },
    ],
  },
  {
    title: "Onboarding Drop-off",
    description: "Significant user drop-off at step 3 of onboarding flow. User research indicates confusion around integration setup process.",
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
      <div className="max-w-4xl mx-auto space-y-4">
        {clusters.map((cluster) => (
          <div key={cluster.title} className="rounded-lg border border-border bg-card p-5">
            {/* Cluster Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`signal-dot ${severityColor[cluster.severity]}`} />
                <h3 className="text-base font-semibold leading-tight">{cluster.title}</h3>
              </div>
              <span className="text-[10px] font-mono-data text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {cluster.count} signals
              </span>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {cluster.description}
            </p>

            {/* Signal Items */}
            <div className="space-y-2">
              {cluster.signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <sig.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className={`text-[10px] font-mono-data font-semibold ${integrationColors[sig.label]}`}>
                      {sig.label}
                    </span>
                    <p className="text-sm leading-tight mt-0.5">{sig.text}</p>
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
