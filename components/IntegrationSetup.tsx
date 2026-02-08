"use client";

import { Layers, GitBranch, FileText, MessageSquare, Mail, Database, Check, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/use-connections";

type IntegrationType = "linear" | "github" | "notion" | "slack" | "gmail" | "supabase";

const integrationColors: Record<IntegrationType, string> = {
  linear: "text-int-linear",
  github: "text-int-github",
  notion: "text-int-notion",
  slack: "text-int-slack",
  gmail: "text-int-gmail",
  supabase: "text-int-supabase",
};

const integrations: { key: IntegrationType; name: string; icon: typeof Layers; desc: string; hasOAuth: boolean }[] = [
  { key: "linear", name: "Linear", icon: Layers, desc: "Sync tickets, sprints, and project data", hasOAuth: true },
  { key: "github", name: "GitHub", icon: GitBranch, desc: "Access repos, PRs, issues, and diffs", hasOAuth: true },
  { key: "notion", name: "Notion", icon: FileText, desc: "Connect pages, databases, and docs", hasOAuth: true },
  { key: "slack", name: "Slack", icon: MessageSquare, desc: "Monitor channels and thread activity", hasOAuth: true },
  { key: "gmail", name: "Gmail", icon: Mail, desc: "Track emails and thread context", hasOAuth: true },
  { key: "supabase", name: "Supabase", icon: Database, desc: "Query tables and monitor functions", hasOAuth: false },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: () => void;
}

export default function IntegrationSetup({ open, onOpenChange, onComplete }: Props) {
  const { connections, connect, disconnect } = useConnections();

  const connectedCount = Object.keys(connections).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Manage Integrations</DialogTitle>
          <DialogDescription>
            Connect or disconnect your tools. {connectedCount} connected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {integrations.map((int) => {
            const isConnected = !!connections[int.key];

            return (
              <div
                key={int.key}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isConnected
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <int.icon className={`w-4 h-4 ${integrationColors[int.key]}`} />
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${integrationColors[int.key]}`}>{int.name}</div>
                    <div className="text-[11px] text-muted-foreground">{int.desc}</div>
                  </div>
                </div>

                {isConnected ? (
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-primary" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => disconnect(int.key)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : int.hasOAuth ? (
                  <Button variant="outline" size="sm" onClick={() => connect(int.key)} className="gap-1 text-xs h-7">
                    <ExternalLink className="w-3 h-3" />
                    Connect
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Auto</span>
                )}
              </div>
            );
          })}
        </div>
        <Button className="w-full mt-4" onClick={onComplete}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}
