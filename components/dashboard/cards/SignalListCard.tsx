import type { SignalListProps } from "@/lib/types";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const sourceMap: Record<string, IntegrationType> = {
  linear: "Linear",
  github: "GitHub",
  notion: "Notion",
  slack: "Slack",
  gmail: "Gmail",
  supabase: "Supabase",
};

const severityDot: Record<string, string> = {
  high: "signal-dot-red",
  medium: "signal-dot-yellow",
  low: "signal-dot-green",
};

export default function SignalListCard({ signals }: SignalListProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
      {signals.map((sig, i) => {
        const integration = sourceMap[sig.source] ?? sig.source;
        const colorClass = integrationColors[integration as IntegrationType] ?? "text-muted-foreground";
        const dotClass = severityDot[sig.severity] ?? "signal-dot-green";

        return (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className={`signal-dot ${dotClass} shrink-0`} />
            <span className={`text-[10px] font-mono-data font-semibold ${colorClass} shrink-0`}>{integration}</span>
            <span className="text-xs truncate">{sig.title}</span>
          </div>
        );
      })}
    </div>
  );
}
