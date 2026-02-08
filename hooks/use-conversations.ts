"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/types";

export function useConversations(scopeId: string | null) {
  const supabase = createClient();

  return useQuery<Conversation[]>({
    queryKey: ["conversations", scopeId],
    enabled: !!scopeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("scope_id", scopeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateConversation() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scopeId, title }: { scopeId: string; title?: string }) => {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ scope_id: scopeId, title: title ?? "New conversation" })
        .select()
        .single();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", data.scope_id] });
    },
  });
}
