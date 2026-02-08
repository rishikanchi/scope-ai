"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

export function useMessages(conversationId: string | null) {
  const supabase = createClient();

  return useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
