"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Message, ToolCallResult, ChatMode } from "@/lib/types";

export function useChat(scopeId: string | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallResult[]>([]);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const sendMessage = useCallback(
    async (message: string, conversationId: string, mode: ChatMode = "chat") => {
      if (!scopeId || !conversationId) return;

      // Optimistically add user message to cache
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "user",
        content: message,
        tool_calls: null,
        metadata: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", conversationId],
        (old) => [...(old ?? []), userMessage]
      );

      setIsStreaming(true);
      setStreamedText("");
      setToolCalls([]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, scopeId, conversationId, mode }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody.error ?? `Chat request failed (${response.status})`;
          console.error("Chat API error:", errMsg);
          setStreamedText(`Error: ${errMsg}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";
        const accumulatedToolCalls: ToolCallResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "text" || parsed.type === "content") {
                accumulated += parsed.content ?? parsed.text ?? "";
                setStreamedText(accumulated);
              } else if (parsed.type === "tool_call" || parsed.type === "tool_result") {
                const toolCall: ToolCallResult = {
                  component: parsed.component,
                  props: parsed.props,
                };
                accumulatedToolCalls.push(toolCall);
                setToolCalls([...accumulatedToolCalls]);
              }
            } catch {
              // Non-JSON line, append as raw text
              if (data.trim()) {
                accumulated += data;
                setStreamedText(accumulated);
              }
            }
          }
        }

        // Save assistant message to DB after stream completes
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: accumulated || null,
          tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null,
        });

        // Refresh messages cache
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsStreaming(false);
      }
    },
    [scopeId, queryClient, supabase]
  );

  return { isStreaming, streamedText, toolCalls, sendMessage };
}
