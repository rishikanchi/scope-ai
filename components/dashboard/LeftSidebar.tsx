"use client";

import { useRouter } from "next/navigation";
import { Plus, Settings, MessageSquare, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversations, useCreateConversation } from "@/hooks/use-conversations";
import { useSignals } from "@/hooks/use-signals";
import { formatDistanceToNow } from "date-fns";

type IntegrationType = "Linear" | "GitHub" | "Notion" | "Slack" | "Gmail" | "Supabase";

const integrationColors: Record<IntegrationType, string> = {
  Linear: "text-int-linear",
  GitHub: "text-int-github",
  Notion: "text-int-notion",
  Slack: "text-int-slack",
  Gmail: "text-int-gmail",
  Supabase: "text-int-supabase",
};

const sourceMap: Record<string, IntegrationType> = {
  linear: "Linear",
  github: "GitHub",
  notion: "Notion",
  slack: "Slack",
  gmail: "Gmail",
  supabase: "Supabase",
};

const severityDot: Record<string, string> = {
  high: "signal-dot-red",
  medium: "signal-dot-yellow",
  low: "signal-dot-green",
};

interface Props {
  scopeId: string | null;
  onConversationChange: (id: string | null) => void;
  activeConversationId: string | null;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

export default function LeftSidebar({
  scopeId,
  onConversationChange,
  activeConversationId,
  collapsed,
  onCollapsedChange,
}: Props) {
  const router = useRouter();
  const { data: conversations } = useConversations(scopeId);
  const { data: signals } = useSignals(scopeId);
  const createConversation = useCreateConversation();

  const handleNewChat = async () => {
    if (!scopeId) return;
    const conv = await createConversation.mutateAsync({ scopeId });
    onConversationChange(conv.id);
  };

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-border flex flex-col shrink-0 bg-card/50 items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="New chat"
          onClick={() => {
            onCollapsedChange(false);
            handleNewChat();
          }}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Signals"
          onClick={() => onCollapsedChange(false)}
        >
          <Radio className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-auto text-muted-foreground hover:text-foreground" onClick={() => router.push("/settings")}>
          <Settings className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r border-border flex flex-col shrink-0 bg-card/50">
      {/* Chats Section */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground tracking-wide">Chats</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleNewChat} disabled={!scopeId}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-0.5">
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onConversationChange(conv.id)}
              className={`px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                activeConversationId === conv.id
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {conv.title ?? "Untitled"}
            </div>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="text-xs text-muted-foreground/60 px-2 py-1">No conversations yet</div>
          )}
        </div>
      </div>

      {/* Signals Feed */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Radio className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground tracking-wide">Signals</span>
          {signals && signals.length > 0 && (
            <span className="ml-auto text-[10px] font-mono-data bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {signals.length}
            </span>
          )}
        </div>
        <div className="space-y-1">
          {signals?.map((sig) => {
            const integration = sourceMap[sig.source] ?? sig.source;
            const colorClass = integrationColors[integration as IntegrationType] ?? "text-muted-foreground";
            const dotClass = severityDot[sig.severity ?? "low"] ?? "signal-dot-green";
            const timeAgo = formatDistanceToNow(new Date(sig.created_at), { addSuffix: true });

            return (
              <div key={sig.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                <span className={`signal-dot ${dotClass} mt-1.5 shrink-0`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono-data font-semibold ${colorClass}`}>
                      {integration}
                    </span>
                  </div>
                  <div className="text-xs text-foreground leading-tight mt-0.5">{sig.title ?? "Untitled signal"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono-data">{timeAgo}</div>
                </div>
              </div>
            );
          })}
          {(!signals || signals.length === 0) && (
            <div className="text-xs text-muted-foreground/60 px-2 py-1">No signals yet</div>
          )}
        </div>
      </div>

      {/* Settings Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/settings")}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
