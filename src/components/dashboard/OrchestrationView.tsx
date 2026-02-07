import { useState } from "react";
import { Layers, GitBranch, MessageSquare, Mail, FileText, Database, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const integrationBgColors: Record<IntegrationType, string> = {
  Linear: "bg-int-linear/10 border-int-linear/20",
  GitHub: "bg-int-github/10 border-int-github/20",
  Notion: "bg-int-notion/10 border-int-notion/20",
  Slack: "bg-int-slack/10 border-int-slack/20",
  Gmail: "bg-int-gmail/10 border-int-gmail/20",
  Supabase: "bg-int-supabase/10 border-int-supabase/20",
};

interface Action {
  id: string;
  service: IntegrationType;
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
        <div className="w-96 border-r border-border overflow-auto shrink-0">
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Action Plan</div>
            <div className="space-y-2">
              {actions.map((action, i) => (
                <div
                  key={action.id}
                  onClick={() => setSelected(action.id)}
                  className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    selected === action.id 
                      ? `${integrationBgColors[action.service]} border-l-2` 
                      : "border-border bg-card hover:bg-muted/50"
                  } ${action.synced ? "opacity-60" : ""}`}
                >
                  {/* Step Number */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
                    <span className="text-[10px] font-mono-data font-semibold">{i + 1}</span>
                  </div>
                  
                  <Checkbox
                    checked={action.checked}
                    onCheckedChange={() => toggle(action.id)}
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="min-w-0 flex-1 ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <action.icon className={`w-4 h-4 ${integrationColors[action.service]}`} />
                      <span className={`text-xs font-semibold ${integrationColors[action.service]}`}>
                        {action.service}
                      </span>
                    </div>
                    <div className="text-sm font-medium mb-1">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.desc}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {action.synced ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-signal-green border-signal-green/30">
                          Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-dashed">
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Editor */}
        <div className="flex-1 overflow-auto p-6">
          {active ? (
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${integrationBgColors[active.service]}`}>
                  <active.icon className={`w-5 h-5 ${integrationColors[active.service]}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${integrationColors[active.service]}`}>
                      {active.service}
                    </span>
                    {active.synced ? (
                      <Badge variant="outline" className="text-[10px] text-signal-green border-signal-green/30">Synced</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-dashed">Draft</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{active.title}</h3>
                </div>
              </div>
              
              <div className="space-y-4">
                {Object.entries(active.payload).map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key}</label>
                    {val.length > 60 ? (
                      <textarea
                        defaultValue={val}
                        className="w-full bg-muted rounded-lg px-4 py-3 text-sm font-mono-data outline-none focus:ring-1 focus:ring-ring resize-none min-h-[100px]"
                      />
                    ) : (
                      <input
                        defaultValue={val}
                        className="w-full bg-muted rounded-lg px-4 py-3 text-sm font-mono-data outline-none focus:ring-1 focus:ring-ring"
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
      <div className="border-t border-border px-6 py-4 flex items-center justify-between shrink-0 bg-card/50">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{actions.filter((a) => a.checked && !a.synced).length}</span> actions staged ·{" "}
          <span className="font-semibold text-signal-green">{actions.filter((a) => a.synced).length}</span> synced
        </div>
        <Button size="sm" onClick={runSync} className="glow-primary-sm">
          <Play className="w-3.5 h-3.5 mr-2" /> Run Sync
        </Button>
      </div>
    </div>
  );
}
