import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, Plus, Layers, GitBranch, FileText, MessageSquare, Mail, Database,
  Settings, PanelLeftClose, PanelLeft
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const scopes = ["Mobile App Redesign", "API v3 Launch", "Onboarding Revamp", "Q1 OKR Planning"];

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const signals: { text: string; status: "red" | "green" | "yellow"; time: string; integration: IntegrationType }[] = [
  { text: "New ticket: ENG-412 Login bug", status: "red", time: "2m ago", integration: "Linear" },
  { text: "Deploy succeeded: api-v3 #142", status: "green", time: "8m ago", integration: "GitHub" },
  { text: "#mobile-dev: crash reports spike", status: "yellow", time: "15m ago", integration: "Slack" },
  { text: "PRD updated by Sarah", status: "green", time: "22m ago", integration: "Notion" },
  { text: "Partner API key request", status: "yellow", time: "1h ago", integration: "Gmail" },
  { text: "Sprint velocity dropped", status: "red", time: "2h ago", integration: "Linear" },
];

const chats = [
  { id: "1", name: "Auth Fix Planning", active: true },
  { id: "2", name: "Q1 Roadmap Review", active: false },
  { id: "3", name: "Performance Analysis", active: false },
];

const statusIcon: Record<string, string> = { red: "signal-dot-red", green: "signal-dot-green", yellow: "signal-dot-yellow" };

interface Props {
  currentScope: string;
  onNewScope: () => void;
  onScopeChange: (s: string) => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

export default function LeftSidebar({ currentScope, onNewScope, onScopeChange, collapsed, onCollapsedChange }: Props) {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState("1");

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-border flex flex-col shrink-0 bg-card/50 items-center py-3 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapsedChange(false)}>
          <PanelLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-auto" onClick={() => navigate("/settings")}>
          <Settings className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r border-border flex flex-col shrink-0 bg-card/50">
      {/* Scope Switcher */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-md bg-secondary text-sm font-medium hover:bg-muted transition-colors">
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
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onCollapsedChange(true)}>
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      {/* Chats Section */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Chats</div>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-0.5">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                activeChat === chat.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {chat.name}
            </div>
          ))}
        </div>
      </div>

      {/* Signals Feed */}
      <div className="flex-1 overflow-auto p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Signals</div>
        <div className="space-y-1">
          {signals.map((sig, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
              <span className={`signal-dot ${statusIcon[sig.status]} mt-1.5 shrink-0`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono-data font-semibold ${integrationColors[sig.integration]}`}>
                    {sig.integration}
                  </span>
                </div>
                <div className="text-xs leading-tight mt-0.5">{sig.text}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-data">{sig.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Button */}
      <div className="p-3 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
