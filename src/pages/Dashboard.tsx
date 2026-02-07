import { useState } from "react";
import { Search, Command, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import RightSidebar from "@/components/dashboard/RightSidebar";
import SynthesisView from "@/components/dashboard/SynthesisView";
import DraftingView from "@/components/dashboard/DraftingView";
import OrchestrationView from "@/components/dashboard/OrchestrationView";
import ScopeCreation from "@/components/ScopeCreation";

type Stage = "none" | "synthesis" | "drafting" | "orchestration";

const stageLabels: { key: Stage; label: string; num: string }[] = [
  { key: "none", label: "Chat", num: "0" },
  { key: "synthesis", label: "Synthesis", num: "1" },
  { key: "drafting", label: "Drafting", num: "2" },
  { key: "orchestration", label: "Orchestration", num: "3" },
];

const scopes = ["Mobile App Redesign", "API v3 Launch", "Onboarding Revamp", "Q1 OKR Planning"];

export default function Dashboard() {
  const [stage, setStage] = useState<Stage>("synthesis");
  const [rightOpen, setRightOpen] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [scopeModal, setScopeModal] = useState(false);
  const [currentScope, setCurrentScope] = useState("Mobile App Redesign");

  const handleScopeCreate = (name: string) => {
    setCurrentScope(name);
    setScopeModal(false);
  };

  const showChatOnly = stage === "none";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Command className="w-3 h-3 text-primary-foreground" />
          </div>
          {/* Scope Dropdown in Header */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm font-medium">
              {currentScope}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover">
              {scopes.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setCurrentScope(s)} className="text-sm">
                  {s}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setScopeModal(true)} className="text-sm text-primary">
                <Plus className="w-3 h-3 mr-1.5" /> New Scope
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stage Switcher */}
        <div className="flex items-center bg-secondary rounded-lg p-0.5 ml-4">
          {stageLabels.map((s) => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                stage === s.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-mono-data text-[10px] opacity-50">{s.num}</span>
              {s.label}
            </button>
          ))}
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
          currentScope={currentScope}
          onNewScope={() => setScopeModal(true)}
          onScopeChange={setCurrentScope}
          collapsed={leftCollapsed}
          onCollapsedChange={setLeftCollapsed}
        />

        {showChatOnly ? (
          <RightSidebar fullWidth />
        ) : (
          <>
            <main className="flex-1 overflow-auto">
              {stage === "synthesis" && <SynthesisView />}
              {stage === "drafting" && <DraftingView />}
              {stage === "orchestration" && <OrchestrationView />}
            </main>

            <RightSidebar 
              collapsed={!rightOpen} 
              onCollapsedChange={(v) => setRightOpen(!v)} 
            />
          </>
        )}
      </div>

      <ScopeCreation open={scopeModal} onOpenChange={setScopeModal} onSubmit={handleScopeCreate} />
    </div>
  );
}
