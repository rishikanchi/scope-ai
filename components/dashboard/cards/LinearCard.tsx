import { Layers } from "lucide-react";
import type { LinearCardProps } from "@/lib/types";

export default function LinearCard({ ticketId, title, status, assignee, priority }: LinearCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <Layers className="w-4 h-4 text-int-linear mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-data text-int-linear font-semibold">{ticketId}</span>
            <span className="text-[10px] font-mono-data bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {status}
            </span>
          </div>
          <h4 className="text-sm font-medium mt-1">{title}</h4>
          <div className="flex items-center gap-3 mt-1.5">
            {assignee && <span className="text-[10px] text-muted-foreground">Assignee: {assignee}</span>}
            {priority && <span className="text-[10px] text-muted-foreground">Priority: {priority}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
