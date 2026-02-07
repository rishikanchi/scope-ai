import { useState } from "react";
import { Search, Command } from "lucide-react";
import LeftSidebar from "@/components/dashboard/LeftSidebar";
import RightSidebar from "@/components/dashboard/RightSidebar";
import SynthesisView from "@/components/dashboard/SynthesisView";
import DraftingView from "@/components/dashboard/DraftingView";
import OrchestrationView from "@/components/dashboard/OrchestrationView";
import ScopeCreation from "@/components/ScopeCreation";

type Stage = "synthesis" | "drafting" | "orchestration";

const stageLabels: { key: Stage; label: string; num: string }[] = [
  { key: "synthesis", label: "Synthesis", num: "1" },
  { key: "drafting", label: "Drafting", num: "2" },
  { key: "orchestration", label: "Orchestration", num: "3" },
];

export default function Dashboard() {
  const [stage, setStage] = useState<Stage>("synthesis");
  const [rightOpen, setRightOpen] = useState(true);
  const [scopeModal, setScopeModal] = useState(false);
  const [currentScope, setCurrentScope] = useState("Mobile App Redesign");

  const handleScopeCreate = (name: string) => {
    setCurrentScope(name);
    setScopeModal(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Command className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Scope</span>
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

        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
        >
          {rightOpen ? "Hide Copilot" : "Show Copilot"}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          currentScope={currentScope}
          onNewScope={() => setScopeModal(true)}
          onScopeChange={setCurrentScope}
        />

        <main className="flex-1 overflow-auto">
          {stage === "synthesis" && <SynthesisView />}
          {stage === "drafting" && <DraftingView />}
          {stage === "orchestration" && <OrchestrationView />}
        </main>

        {rightOpen && <RightSidebar />}
      </div>

      <ScopeCreation open={scopeModal} onOpenChange={setScopeModal} onSubmit={handleScopeCreate} />
    </div>
  );
}
