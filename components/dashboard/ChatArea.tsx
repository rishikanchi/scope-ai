"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, MessageSquare, Sparkles, FileText, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessages } from "@/hooks/use-messages";
import { useChat } from "@/hooks/use-chat";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useQueryClient } from "@tanstack/react-query";
import RichCard from "@/components/dashboard/RichCard";
import type { ToolCallResult, ChatMode } from "@/lib/types";

const MODE_CONFIG: Record<ChatMode, { label: string; icon: React.ReactNode; placeholder: string }> = {
  chat: { label: "Chat", icon: <Bot className="w-3.5 h-3.5" />, placeholder: "Ask Scope..." },
  synthesize: { label: "Synthesize", icon: <Sparkles className="w-3.5 h-3.5" />, placeholder: "What should I analyze? e.g. 'Find patterns across all signals'" },
  draft: { label: "Draft", icon: <FileText className="w-3.5 h-3.5" />, placeholder: "What should I write? e.g. 'Write a PRD for the auth redesign'" },
  orchestrate: { label: "Orchestrate", icon: <Zap className="w-3.5 h-3.5" />, placeholder: "What actions? e.g. 'Create a Linear issue about updating the palette'" },
};

interface Props {
  scopeId: string | null;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none break-words
      prose-p:my-1 prose-p:leading-relaxed
      prose-ul:my-1.5 prose-ol:my-1.5
      prose-li:my-0.5
      prose-headings:my-2 prose-headings:font-semibold
      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
      prose-strong:text-foreground prose-strong:font-semibold
      prose-code:text-xs prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-background/50 prose-pre:rounded-md prose-pre:p-3
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function ModeSelector({ mode, setMode, disabled }: { mode: ChatMode; setMode: (m: ChatMode) => void; disabled?: boolean }) {
  return (
    <Select value={mode} onValueChange={(v) => setMode(v as ChatMode)} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-9 shrink-0 text-xs border-border bg-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MODE_CONFIG) as ChatMode[]).map((m) => (
          <SelectItem key={m} value={m} className="text-xs">
            <div className="flex items-center gap-1.5">
              {MODE_CONFIG[m].icon}
              {MODE_CONFIG[m].label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ChatArea({ scopeId, conversationId, onConversationCreated }: Props) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: messages } = useMessages(conversationId);
  const { isStreaming, streamedText, toolCalls, sendMessage } = useChat(scopeId);
  const createConversation = useCreateConversation();
  const queryClient = useQueryClient();

  const generateTitle = (message: string, convId: string) => {
    fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId: convId }),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations", scopeId] });
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  const handleFormSubmit = async (action: string, fields: Record<string, string>) => {
    if (!scopeId || isStreaming || !conversationId) return;
    const fieldsStr = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
    const msg = `CONFIRMED: Execute ${action}\n${fieldsStr}`;
    await sendMessage(msg, conversationId);
  };

  const handleSend = async () => {
    if (!input.trim() || !scopeId || isStreaming) return;

    const text = input.trim();
    setInput("");

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const conv = await createConversation.mutateAsync({ scopeId, title: "New conversation" });
      activeConversationId = conv.id;
      onConversationCreated(conv.id);
      generateTitle(text, conv.id);
    } else {
      const msgs = queryClient.getQueryData<any[]>(["messages", activeConversationId]);
      if (!msgs || msgs.length === 0) {
        generateTitle(text, activeConversationId);
      }
    }

    const currentMode = mode;
    if (currentMode !== "chat") setMode("chat");
    await sendMessage(text, activeConversationId, currentMode);
  };

  if (!conversationId && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Start a conversation with Scope</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Ask questions about your signals, request synthesis reports, or orchestrate actions across your tools.
        </p>
        <div className="w-full max-w-md">
          <div className="flex gap-2">
            <ModeSelector mode={mode} setMode={setMode} disabled={!scopeId} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={scopeId ? MODE_CONFIG[mode].placeholder : "Select a scope first"}
              disabled={!scopeId}
              className="flex-1 bg-muted rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button size="sm" className="h-10 w-10 p-0 shrink-0" onClick={handleSend} disabled={!scopeId || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2 shrink-0">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold">Chat</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.role === "assistant" && msg.content ? (
                  <Markdown content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>
            {msg.tool_calls?.map((tc: ToolCallResult, i: number) => (
              <div key={i} className="mt-2 ml-0 max-w-[85%]">
                <RichCard component={tc.component} props={tc.props} onFormSubmit={handleFormSubmit} />
              </div>
            ))}
          </div>
        ))}

        {isStreaming && (streamedText || toolCalls.length > 0) && (
          <div>
            {streamedText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-4 py-3 text-sm bg-muted text-foreground">
                  <Markdown content={streamedText} />
                </div>
              </div>
            )}
            {toolCalls.map((tc, i) => (
              <div key={i} className="mt-2 ml-0 max-w-[85%]">
                <RichCard component={tc.component} props={tc.props} onFormSubmit={handleFormSubmit} />
              </div>
            ))}
          </div>
        )}

        {isStreaming && !streamedText && toolCalls.length === 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <div className="flex gap-2">
          <ModeSelector mode={mode} setMode={setMode} disabled={isStreaming} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={MODE_CONFIG[mode].placeholder}
            disabled={isStreaming}
            className="flex-1 bg-muted rounded-md px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={handleSend} disabled={isStreaming || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
