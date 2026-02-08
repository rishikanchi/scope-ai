"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Layers, GitBranch, FileText, MessageSquare, Mail, ChevronRight, ExternalLink } from "lucide-react";
import { useCreateScope, useUpdateScope } from "@/hooks/use-scopes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Scope } from "@/lib/types";

interface Resource {
  id: string;
  provider: string;
  label: string;
  type: string;
}

const ALL_PROVIDERS = ["github", "linear", "slack", "notion", "gmail"] as const;

const providerMeta: Record<string, { name: string; icon: typeof Layers; colorClass: string }> = {
  slack: { name: "Slack", icon: MessageSquare, colorClass: "text-int-slack" },
  github: { name: "GitHub", icon: GitBranch, colorClass: "text-int-github" },
  linear: { name: "Linear", icon: Layers, colorClass: "text-int-linear" },
  notion: { name: "Notion", icon: FileText, colorClass: "text-int-notion" },
  gmail: { name: "Gmail", icon: Mail, colorClass: "text-int-gmail" },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (scope: { id: string; name: string }) => void;
  editScope?: Scope | null;
}

export default function ScopeCreation({ open, onOpenChange, onSubmit, editScope }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const createScope = useCreateScope();
  const updateScope = useUpdateScope();
  const queryClient = useQueryClient();

  const isEdit = !!editScope;

  // Pre-populate when editing
  useEffect(() => {
    if (open && editScope) {
      setName(editScope.name);
      setSelected(editScope.datasources ?? []);
    } else if (open && !editScope) {
      setName("");
      setSelected([]);
    }
  }, [open, editScope]);

  // Fetch resources (only returns connected providers)
  const { data: resources, isLoading: resourcesLoading, refetch: refetchResources } = useQuery<Resource[]>({
    queryKey: ["integration-resources"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/integrations/resources");
      if (!res.ok) throw new Error("Failed to fetch resources");
      const data = await res.json();
      return data.resources;
    },
  });

  // Fetch connection status (which providers are connected)
  const { data: connectionStatus, isLoading: connectionsLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["connections"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/integrations/status");
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      return data.connected;
    },
  });

  const isLoading = resourcesLoading || connectionsLoading;

  // Listen for OAuth popup completion — refetch resources + connections
  useEffect(() => {
    if (!open) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "oauth_complete") {
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["integration-resources"] });
        refetchResources();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, queryClient, refetchResources]);

  const connectProvider = useCallback((provider: string) => {
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

  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const selectAll = () => {
    if (!resources) return;
    setSelected(resources.map((r) => r.id));
  };

  const syncSignals = async (scopeId: string, added: string[], removed: string[]) => {
    if (added.length === 0 && removed.length === 0) return;

    try {
      const res = await fetch("/api/scopes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId, addedDatasources: added, removedDatasources: removed }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to sync signals");
        return;
      }

      if (data.insertedCount > 0) {
        toast.success(`Synced ${data.insertedCount} signals`);
        queryClient.invalidateQueries({ queryKey: ["signals", scopeId] });
      } else if (data.errors?.length > 0) {
        toast.error(data.errors[0]);
      } else {
        toast.warning("No signals found from selected data sources");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Network error during sync");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSyncing(true);

    try {
      let scope;
      if (isEdit && editScope) {
        const oldDs = editScope.datasources ?? [];
        const added = selected.filter((d) => !oldDs.includes(d));
        const removed = oldDs.filter((d) => !selected.includes(d));

        scope = await updateScope.mutateAsync({ id: editScope.id, name: name.trim(), datasources: selected });
        onSubmit({ id: scope.id, name: scope.name });
        setName("");
        setSelected([]);
        await syncSignals(scope.id, added, removed);
      } else {
        scope = await createScope.mutateAsync({ name: name.trim(), datasources: selected });
        onSubmit({ id: scope.id, name: scope.name });
        setName("");
        setSelected([]);
        await syncSignals(scope.id, selected, []);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save scope");
    } finally {
      setSyncing(false);
    }
  };

  const isPending = createScope.isPending || updateScope.isPending;

  // Group resources by provider
  const grouped: Record<string, Resource[]> = {};
  for (const r of resources ?? []) {
    if (!grouped[r.provider]) grouped[r.provider] = [];
    grouped[r.provider].push(r);
  }

  // Determine connected vs unconnected providers
  const connectedProviders = new Set(Object.keys(connectionStatus ?? {}));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Manage Scope" : "Create New Scope"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the scope name or change which data sources are monitored."
              : "Name your initiative and select data sources to monitor."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2 flex-1 overflow-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Scope name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Data sources</Label>
              {resources && resources.length > 0 && (
                <button
                  onClick={selectAll}
                  className="text-[10px] text-primary hover:underline"
                >
                  Select all
                </button>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && (
              <div className="rounded-lg border border-border max-h-60 overflow-auto divide-y divide-border">
                {ALL_PROVIDERS.map((provider) => {
                  const meta = providerMeta[provider];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  const isConnected = connectedProviders.has(provider);
                  const providerResources = grouped[provider] ?? [];
                  const isOpen = !!expanded[provider];
                  const selectedCount = providerResources.filter((r) => selected.includes(r.id)).length;
                  const totalCount = providerResources.length;

                  if (!isConnected) {
                    // Show unconnected provider with connect button
                    return (
                      <div key={provider} className="flex items-center gap-2 px-3 py-2.5">
                        <div className="w-3 h-3" /> {/* spacer for alignment */}
                        <Icon className={`w-3.5 h-3.5 ${meta.colorClass} opacity-50`} />
                        <span className="text-xs text-muted-foreground flex-1">{meta.name}</span>
                        <button
                          type="button"
                          onClick={() => connectProvider(provider)}
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Connect
                        </button>
                      </div>
                    );
                  }

                  // Connected provider with resources
                  return (
                    <div key={provider}>
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [provider]: !e[provider] }))}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <Icon className={`w-3.5 h-3.5 ${meta.colorClass}`} />
                        <span className={`text-xs font-semibold ${meta.colorClass}`}>
                          {meta.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto font-mono-data">
                          {selectedCount > 0 ? `${selectedCount}/` : ""}{totalCount}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="space-y-1 px-3 pb-2.5 ml-5">
                          {totalCount === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-1">No resources found</p>
                          ) : (
                            providerResources.map((r) => (
                              <label key={r.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                                <Checkbox
                                  checked={selected.includes(r.id)}
                                  onCheckedChange={() => toggle(r.id)}
                                />
                                <span className="text-xs font-mono-data">{r.label}</span>
                                <span className="text-[9px] text-muted-foreground ml-auto">{r.type}</span>
                              </label>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim() || isPending || syncing}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Scope"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
