import { useState } from "react";
import { Layers, GitBranch, MessageSquare, Mail, FileText, Database, CheckCircle2, Circle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Action {
  id: string;
  service: string;
  icon: typeof Layers;
  title: string;
  desc: string;
  synced: boolean;
  checked: boolean;
  payload: Record<string, string>;
}

const initialActions: Action[] = [
  {
    id: "1", service: "Linear", icon: Layers, title: "Create Ticket: Auth Fix",
    desc: "Create a P1 ticket for the OAuth redirect fix", synced: false, checked: false,
    payload: { title: "Fix OAuth redirect loop on mobile Safari", priority: "Urgent", assignee: "Sarah Chen", team: "Engineering", labels: "bug, auth, mobile" },
  },
  {
    id: "2", service: "GitHub", icon: GitBranch, title: "Create Branch: fix/oauth-redirect",
    desc: "Create feature branch from main", synced: false, checked: false,
    payload: { repo: "scope-app/backend", base: "main", branch: "fix/oauth-redirect", description: "Branch for OAuth redirect loop fix" },
  },
  {
    id: "3", service: "Slack", icon: MessageSquare, title: "Post Update: #engineering",
    desc: "Notify team about the auth fix initiative", synced: false, checked: false,
    payload: { channel: "#engineering", message: "🔧 Starting work on OAuth redirect fix (ENG-412). ETA: 2 days. cc @sarah @mike", thread: "No" },
  },
  {
    id: "4", service: "Gmail", icon: Mail, title: "Send Update: Stakeholders",
    desc: "Email status update to stakeholders", synced: false, checked: true,
    payload: { to: "pm-leads@company.com", subject: "Auth Fix Initiative — Status Update", body: "Hi team, we've identified the root cause of the mobile login failures..." },
  },
  {
    id: "5", service: "Notion", icon: FileText, title: "Update PRD: Auth Section",
    desc: "Link the PRD to the new ticket and branch", synced: true, checked: true,
    payload: { page: "Mobile Auth Fix — PRD", section: "Implementation", content: "Added references to ENG-412 and fix/oauth-redirect branch" },
  },
  {
    id: "6", service: "Supabase", icon: Database, title: "Add Index: auth_sessions",
    desc: "Add index on token_expiry column", synced: false, checked: false,
    payload: { table: "auth_sessions", column: "token_expiry", type: "btree", name: "idx_auth_sessions_token_expiry" },
  },
];

export default function OrchestrationView() {
  const [actions, setActions] = useState(initialActions);
  const [selected, setSelected] = useState<string>("1");

  const toggle = (id: string) => {
    setActions((a) => a.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)));
  };

  const runSync = () => {
    setActions((a) => a.map((x) => (x.checked ? { ...x, synced: true } : x)));
  };

  const active = actions.find((a) => a.id === selected);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Action List */}
        <div className="w-80 border-r border-border overflow-auto shrink-0">
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Action Plan</div>
          </div>
          <div className="px-2">
            {actions.map((action, i) => (
              <div
                key={action.id}
                onClick={() => setSelected(action.id)}
                className={`flex items-start gap-2.5 p-2.5 rounded-md cursor-pointer mb-0.5 transition-all ${
                  selected === action.id ? "bg-muted" : "hover:bg-muted/50"
                } ${action.synced ? "opacity-60" : ""}`}
              >
                <Checkbox
                  checked={action.checked}
                  onCheckedChange={() => toggle(action.id)}
                  className="mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <action.icon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold truncate">{action.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-mono-data text-muted-foreground">{action.service}</span>
                    {action.synced ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-signal-green border-signal-green/30">Synced</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-dashed">Draft</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Editor */}
        <div className="flex-1 overflow-auto p-4">
          {active ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <active.icon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{active.title}</h3>
                {active.synced ? (
                  <Badge variant="outline" className="text-[10px] text-signal-green border-signal-green/30">Synced</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-dashed">Draft</Badge>
                )}
              </div>
              <div className="space-y-3">
                {Object.entries(active.payload).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key}</label>
                    {val.length > 60 ? (
                      <textarea
                        defaultValue={val}
                        className="w-full bg-muted rounded-md px-3 py-2 text-xs font-mono-data outline-none focus:ring-1 focus:ring-ring resize-none min-h-[80px]"
                      />
                    ) : (
                      <input
                        defaultValue={val}
                        className="w-full bg-muted rounded-md px-3 py-2 text-xs font-mono-data outline-none focus:ring-1 focus:ring-ring"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select an action to edit
            </div>
          )}
        </div>
      </div>

      {/* Execution Bar */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="text-xs text-muted-foreground">
          {actions.filter((a) => a.checked && !a.synced).length} actions staged ·{" "}
          {actions.filter((a) => a.synced).length} synced
        </div>
        <Button size="sm" onClick={runSync} className="glow-primary-sm">
          <Play className="w-3 h-3 mr-1.5" /> Run Sync
        </Button>
      </div>
    </div>
  );
}
