import { useState } from "react";
import {
  ChevronDown, Plus, Layers, GitBranch, FileText, MessageSquare, Mail, Database,
  AlertCircle, CheckCircle, Clock
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const scopes = ["Mobile App Redesign", "API v3 Launch", "Onboarding Revamp", "Q1 OKR Planning"];

const signals = [
  { text: "New ticket: ENG-412 Login bug", status: "red" as const, time: "2m ago" },
  { text: "Deploy succeeded: api-v3 #142", status: "green" as const, time: "8m ago" },
  { text: "#mobile-dev: crash reports spike", status: "yellow" as const, time: "15m ago" },
  { text: "Notion: PRD updated by Sarah", status: "green" as const, time: "22m ago" },
  { text: "Gmail: Partner API key request", status: "yellow" as const, time: "1h ago" },
  { text: "Linear: Sprint velocity dropped", status: "red" as const, time: "2h ago" },
];

const integrations = [
  { name: "Linear", icon: Layers, connected: true },
  { name: "GitHub", icon: GitBranch, connected: true },
  { name: "Notion", icon: FileText, connected: true },
  { name: "Slack", icon: MessageSquare, connected: true },
  { name: "Gmail", icon: Mail, connected: false },
  { name: "Supabase", icon: Database, connected: false },
];

const statusIcon: Record<string, string> = { red: "signal-dot-red", green: "signal-dot-green", yellow: "signal-dot-yellow" };

interface Props {
  currentScope: string;
  onNewScope: () => void;
  onScopeChange: (s: string) => void;
}

export default function LeftSidebar({ currentScope, onNewScope, onScopeChange }: Props) {
  return (
    <aside className="w-60 border-r border-border flex flex-col shrink-0 bg-card/50">
      {/* Scope Switcher */}
      <div className="p-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-secondary text-sm font-medium hover:bg-muted transition-colors">
            <span className="truncate">{currentScope}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover">
            {scopes.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onScopeChange(s)} className="text-sm">
                {s}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={onNewScope} className="text-sm text-primary">
              <Plus className="w-3 h-3 mr-1.5" /> New Scope
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Signals Feed */}
      <div className="flex-1 overflow-auto p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Signals</div>
        <div className="space-y-1">
          {signals.map((sig, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
              <span className={`signal-dot ${statusIcon[sig.status]} mt-1.5 shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs leading-tight truncate">{sig.text}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-data">{sig.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      <div className="p-3 border-t border-border">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Integrations</div>
        <div className="grid grid-cols-3 gap-2">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex flex-col items-center gap-1 p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              title={`${int.name}: ${int.connected ? "Connected" : "Disconnected"}`}
            >
              <div className="relative">
                <int.icon className="w-4 h-4 text-muted-foreground" />
                <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${int.connected ? "bg-signal-green" : "bg-signal-red"}`} />
              </div>
              <span className="text-[9px] text-muted-foreground">{int.name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
