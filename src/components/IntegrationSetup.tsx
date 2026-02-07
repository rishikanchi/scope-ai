import { useState } from "react";
import { Layers, GitBranch, FileText, MessageSquare, Mail, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const integrations = [
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

  const toggle = (name: string) => {
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
            <div key={int.name} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-muted-foreground/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <int.icon className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{int.name}</div>
                  <div className="text-[11px] text-muted-foreground">{int.desc}</div>
                </div>
              </div>
              <Switch checked={states[int.name]} onCheckedChange={() => toggle(int.name)} />
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" onClick={onComplete}>Continue to Dashboard</Button>
      </DialogContent>
    </Dialog>
  );
}
