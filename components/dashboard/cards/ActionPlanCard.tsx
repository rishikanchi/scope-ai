import type { ActionPlanProps } from "@/lib/types";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const serviceMap: Record<string, IntegrationType> = {
  linear: "Linear",
  github: "GitHub",
  notion: "Notion",
  slack: "Slack",
  gmail: "Gmail",
  supabase: "Supabase",
};

export default function ActionPlanCard({ actions }: ActionPlanProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Action Plan</h4>
      <ol className="space-y-3">
        {actions.map((action, i) => {
          const integration = serviceMap[action.service] ?? action.service;
          const colorClass = integrationColors[integration as IntegrationType] ?? "text-muted-foreground";

          return (
            <li key={i} className="flex gap-3">
              <span className="text-xs font-mono-data text-muted-foreground w-4 shrink-0 pt-0.5">{i + 1}.</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono-data font-semibold ${colorClass}`}>{integration}</span>
                </div>
                <div className="text-sm font-medium mt-0.5">{action.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
