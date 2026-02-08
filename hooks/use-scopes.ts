"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Scope } from "@/lib/types";

export function useScopes() {
  const supabase = createClient();

  return useQuery<Scope[]>({
    queryKey: ["scopes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scopes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateScope() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, datasources }: { name: string; datasources?: string[] }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scopes")
        .insert({ user_id: user.id, name, datasources: datasources ?? [] })
        .select()
        .single();
      if (error) throw error;
      return data as Scope;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scopes"] });
    },
  });
}

export function useUpdateScope() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, datasources }: { id: string; name: string; datasources: string[] }) => {
      const { data, error } = await supabase
        .from("scopes")
        .update({ name, datasources, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Scope;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scopes"] });
    },
  });
}
