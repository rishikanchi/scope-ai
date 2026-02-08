"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/types";

export function useSignals(scopeId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery<Signal[]>({
    queryKey: ["signals", scopeId],
    enabled: !!scopeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("scope_id", scopeId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for new signals
  useEffect(() => {
    if (!scopeId) return;

    const channel = supabase
      .channel(`signals-${scopeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "signals",
          filter: `scope_id=eq.${scopeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["signals", scopeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopeId, queryClient, supabase]);

  return query;
}
