import { useState } from "react";
import { FileText, Link2, ExternalLink, Layers, MessageSquare, Database } from "lucide-react";

const contextCards = [
  { type: "Linear", icon: Layers, title: "ENG-412", desc: "OAuth redirect loop on mobile Safari", status: "In Progress" },
  { type: "Slack", icon: MessageSquare, title: "#mobile-dev", desc: "Thread: login issues spike after v2.4 deploy", status: "12 replies" },
  { type: "Supabase", icon: Database, title: "auth_sessions", desc: "token_expiry column showing null values for 8% of rows", status: "Live" },
];

export default function DraftingView() {
  const [activeRef, setActiveRef] = useState<number | null>(null);

  return (
    <div className="flex h-full">
      {/* Editor */}
      <div className="flex-1 overflow-auto p-6 border-r border-border">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <input
              type="text"
              defaultValue="Mobile Authentication Fix — PRD"
              className="w-full text-2xl font-bold bg-transparent outline-none border-none placeholder:text-muted-foreground"
              placeholder="Document title..."
            />
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>Draft</span>
              <span>·</span>
              <span>Last edited 2 min ago</span>
            </div>
          </div>

          <div className="prose prose-sm prose-invert max-w-none space-y-4">
            <h2
              contentEditable
              suppressContentEditableWarning
              className="text-lg font-semibold outline-none"
            >
              Problem Statement
            </h2>
            <p
              contentEditable
              suppressContentEditableWarning
              className="text-sm text-muted-foreground leading-relaxed outline-none"
            >
              Since the v2.4 deployment on Jan 15, mobile users on Safari have experienced a 340% increase in authentication failures.
              The root cause appears to be a session token expiry issue where tokens are not being refreshed correctly on redirect.
            </p>

            <div
              className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline"
              onClick={() => setActiveRef(0)}
            >
              <Link2 className="w-3 h-3" />
              See: ENG-412 — OAuth redirect loop
            </div>

            <h2
              contentEditable
              suppressContentEditableWarning
              className="text-lg font-semibold outline-none mt-6"
            >
              Impact
            </h2>
            <p
              contentEditable
              suppressContentEditableWarning
              className="text-sm text-muted-foreground leading-relaxed outline-none"
            >
              Approximately 1,200 users affected daily. NPS score dropped 8 points in the mobile segment. Support ticket volume increased 45%.
            </p>

            <div
              className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline"
              onClick={() => setActiveRef(2)}
            >
              <Link2 className="w-3 h-3" />
              Data: auth_sessions table analysis
            </div>

            <h2
              contentEditable
              suppressContentEditableWarning
              className="text-lg font-semibold outline-none mt-6"
            >
              Proposed Solution
            </h2>
            <div
              contentEditable
              suppressContentEditableWarning
              className="bg-muted rounded-lg p-3 font-mono text-xs outline-none"
            >
              {`// Proposed fix: Add token refresh on redirect\nif (session.isExpired()) {\n  await refreshToken(session.userId);\n  redirect(session.callbackUrl);\n}`}
            </div>
          </div>
        </div>
      </div>

      {/* Context Rail */}
      <div className="w-64 overflow-auto p-3 shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Context</div>
        <div className="space-y-2">
          {contextCards.map((card, i) => (
            <div
              key={i}
              onClick={() => setActiveRef(i)}
              className={`rounded-lg border p-3 cursor-pointer transition-all ${
                activeRef === i
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono-data text-muted-foreground">{card.type}</span>
              </div>
              <div className="text-xs font-semibold">{card.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{card.desc}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{card.status}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
