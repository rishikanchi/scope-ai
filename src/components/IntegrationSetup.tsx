import { useState } from "react";
import { Layers, GitBranch, FileText, MessageSquare, Mail, Database, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

const integrations: { name: IntegrationType; icon: typeof Layers; desc: string; defaultOn: boolean }[] = [
  { name: "Linear", icon: Layers, desc: "Sync tickets, sprints, and project data", defaultOn: true },
  { name: "GitHub", icon: GitBranch, desc: "Access repos, PRs, issues, and diffs", defaultOn: true },
  { name: "Notion", icon: FileText, desc: "Connect pages, databases, and docs", defaultOn: false },
  { name: "Slack", icon: MessageSquare, desc: "Monitor channels and thread activity", defaultOn: true },
  { name: "Gmail", icon: Mail, desc: "Track emails and thread context", defaultOn: false },
  { name: "Supabase", icon: Database, desc: "Query tables and monitor functions", defaultOn: true },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: () => void;
}

export default function IntegrationSetup({ open, onOpenChange, onComplete }: Props) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(integrations.map((i) => [i.name, i.defaultOn]))
  );

  const toggle = (name: IntegrationType) => {
    setStates((s) => ({ ...s, [name]: !s[name] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Connect Integrations</DialogTitle>
          <DialogDescription>Choose which services to sync with Scope.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {integrations.map((int) => (
            <div 
              key={int.name} 
              onClick={() => toggle(int.name)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                states[int.name] 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <int.icon className={`w-4 h-4 ${integrationColors[int.name]}`} />
                </div>
                <div>
                  <div className={`text-sm font-medium ${integrationColors[int.name]}`}>{int.name}</div>
                  <div className="text-[11px] text-muted-foreground">{int.desc}</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                states[int.name] 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground/30"
              }`}>
                {states[int.name] && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" onClick={onComplete}>Continue to Dashboard</Button>
      </DialogContent>
    </Dialog>
  );
}
