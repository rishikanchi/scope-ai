"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, ChevronDown, Plus, PanelLeft, PanelLeftClose, Settings2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import ChatArea from "@/components/dashboard/ChatArea";
import ScopeCreation from "@/components/ScopeCreation";
import { useScopes } from "@/hooks/use-scopes";

export default function Dashboard() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [scopeModal, setScopeModal] = useState(false);
  const [editingScope, setEditingScope] = useState(false);
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { data: scopes } = useScopes();

  // Auto-select first scope on load
  useEffect(() => {
    if (scopes && scopes.length > 0 && !scopeId) {
      setScopeId(scopes[0].id);
    }
  }, [scopes, scopeId]);

  const currentScope = scopes?.find((s) => s.id === scopeId);

  const handleScopeCreate = (scope: { id: string; name: string }) => {
    setScopeId(scope.id);
    setConversationId(null);
    setScopeModal(false);
    setEditingScope(false);
  };

  const handleScopeChange = (id: string) => {
    setScopeId(id);
    setConversationId(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/scope_logo.png" alt="Scope" width={24} height={24} className="rounded" />
          {/* Scope Dropdown in Header */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm font-medium">
              {currentScope?.name ?? "Select scope"}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              {scopes?.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => handleScopeChange(s.id)} className="text-sm">
                  {s.name}
                </DropdownMenuItem>
              ))}
              {currentScope && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setEditingScope(true); setScopeModal(true); }} className="text-sm text-muted-foreground">
                    <Settings2 className="w-3 h-3 mr-1.5" /> Manage Scope
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setEditingScope(false); setScopeModal(true); }} className="text-sm text-primary">
                <Plus className="w-3 h-3 mr-1.5" /> New Scope
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {leftCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1" />

        {/* Cmd+K trigger */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="w-3 h-3" />
          Search
          <kbd className="ml-2 font-mono-data text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          scopeId={scopeId}
          onConversationChange={setConversationId}
          activeConversationId={conversationId}
          collapsed={leftCollapsed}
          onCollapsedChange={setLeftCollapsed}
        />

        <ChatArea
          scopeId={scopeId}
          conversationId={conversationId}
          onConversationCreated={setConversationId}
        />
      </div>

      <ScopeCreation
        open={scopeModal}
        onOpenChange={(v) => { setScopeModal(v); if (!v) setEditingScope(false); }}
        onSubmit={handleScopeCreate}
        editScope={editingScope ? currentScope ?? null : null}
      />
    </div>
  );
}
