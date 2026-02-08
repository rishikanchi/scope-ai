"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";

interface ConnectionInfo {
  metadata: Record<string, unknown>;
  connectedAt: string;
}

export function useConnections() {
  const queryClient = useQueryClient();

  const query = useQuery<Record<string, ConnectionInfo>>({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/status");
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      return data.connected;
    },
  });

  // Listen for OAuth popup completion messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "oauth_complete") {
        queryClient.invalidateQueries({ queryKey: ["connections"] });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [queryClient]);

  const connect = useCallback((provider: string) => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      `/api/integrations/${provider}/authorize`,
      `connect-${provider}`,
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  return {
    connections: query.data ?? {},
    isLoading: query.isLoading,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
