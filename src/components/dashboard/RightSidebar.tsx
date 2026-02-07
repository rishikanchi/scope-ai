import { useState } from "react";
import { Send, GripVertical, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

const dummyMessages = [
  { role: "assistant" as const, text: "I've analyzed the latest signals. There are 3 clusters forming around login issues. Want me to create a synthesis report?" },
  { role: "user" as const, text: "Yes, focus on the mobile-specific ones." },
  { role: "assistant" as const, text: "Done. I've grouped 12 signals into a \"Mobile Login Failures\" cluster. The primary sources are Slack #mobile-dev and Linear tickets ENG-410 through ENG-415." },
];

export default function RightSidebar() {
  const [messages, setMessages] = useState(dummyMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }, { role: "assistant", text: "I'll look into that. Give me a moment to analyze the relevant data sources..." }]);
    setInput("");
  };

  return (
    <aside className="w-72 border-l border-border flex flex-col shrink-0 bg-card/50">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold">Copilot</span>
        <span className="signal-dot signal-dot-green ml-auto" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
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
      <div className="px-3 pb-2">
        <div className="border border-dashed border-border rounded-lg p-3 text-center">
          <GripVertical className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-[10px] text-muted-foreground">Drop cards here to discuss</div>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Copilot..."
            className="flex-1 bg-muted rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSend}>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
