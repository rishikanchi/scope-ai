"use client";

import InsightCard from "@/components/dashboard/cards/InsightCard";
import LinearCard from "@/components/dashboard/cards/LinearCard";
import SignalListCard from "@/components/dashboard/cards/SignalListCard";
import ActionPlanCard from "@/components/dashboard/cards/ActionPlanCard";
import DraftCard from "@/components/dashboard/cards/DraftCard";
import FormCard from "@/components/dashboard/cards/FormCard";

const cardMap: Record<string, React.ComponentType<any>> = {
  insight_card: InsightCard,
  linear_card: LinearCard,
  signal_list: SignalListCard,
  action_plan: ActionPlanCard,
  draft_card: DraftCard,
  form: FormCard,
};

interface Props {
  component: string;
  props: Record<string, unknown>;
  onFormSubmit?: (action: string, fields: Record<string, string>) => void;
}

export default function RichCard({ component, props, onFormSubmit }: Props) {
  const Component = cardMap[component];

  if (!Component) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Unknown component: {component}
      </div>
    );
  }

  // Pass onSubmit callback to FormCard
  if (component === "form" && onFormSubmit) {
    return <Component {...props} onSubmit={onFormSubmit} />;
  }

  return <Component {...props} />;
}
