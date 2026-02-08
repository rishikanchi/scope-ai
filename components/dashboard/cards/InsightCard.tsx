import type { InsightCardProps } from "@/lib/types";

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

export default function InsightCard({ severity, title, description, signalCount, evidence }: InsightCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <span className={`signal-dot ${severityDot[severity] ?? "signal-dot-green"} mt-1 shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{title}</h4>
            <span className="text-[10px] font-mono-data bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
              {signalCount} signals
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>

          {evidence && evidence.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Evidence</span>
              {evidence.map((ev, i) => {
                const integration = sourceMap[ev.source] ?? ev.source;
                const colorClass = integrationColors[integration as IntegrationType] ?? "text-muted-foreground";
                const dotClass = severityDot[ev.severity ?? "low"] ?? "signal-dot-green";
                return (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className={`signal-dot ${dotClass} shrink-0`} />
                    <span className={`text-[10px] font-mono-data font-semibold ${colorClass} shrink-0`}>{integration}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{ev.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
