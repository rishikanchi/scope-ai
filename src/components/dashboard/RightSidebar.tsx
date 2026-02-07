import { useState } from "react";
import { Send, GripVertical, Bot, Paperclip, PanelRightClose, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const dummyMessages = [
  { role: "assistant" as const, text: "I've analyzed the latest signals. There are 3 clusters forming around login issues. Want me to create a synthesis report?" },
  { role: "user" as const, text: "Yes, focus on the mobile-specific ones." },
  { role: "assistant" as const, text: "Done. I've grouped 12 signals into a \"Mobile Login Failures\" cluster. The primary sources are Slack #mobile-dev and Linear tickets ENG-410 through ENG-415." },
];

interface Props {
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
  fullWidth?: boolean;
}

export default function RightSidebar({ collapsed, onCollapsedChange, fullWidth }: Props) {
  const [messages, setMessages] = useState(dummyMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }, { role: "assistant", text: "I'll look into that. Give me a moment to analyze the relevant data sources..." }]);
    setInput("");
  };

  if (collapsed) {
    return (
      <aside className="w-12 border-l border-border flex flex-col shrink-0 bg-card/50 items-center py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapsedChange?.(false)}>
          <PanelRight className="w-4 h-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className={`${fullWidth ? 'flex-1' : 'w-96'} border-l border-border flex flex-col shrink-0 bg-card/50`}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold">Chat</span>
        <span className="signal-dot signal-dot-green ml-auto" />
        {onCollapsedChange && (
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => onCollapsedChange(true)}>
            <PanelRightClose className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Context Drop Zone */}
      <div className="px-4 pb-3">
        <div className="border border-dashed border-border rounded-lg p-4 text-center">
          <GripVertical className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Drop cards here to discuss</div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Chat..."
            className="flex-1 bg-muted rounded-md px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
