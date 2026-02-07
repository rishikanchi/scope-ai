import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Search, FileText, Zap, Layers, Settings, Plus } from "lucide-react";

const commands = [
  { group: "Navigation", items: [
    { label: "Go to Dashboard", icon: Layers, action: "/dashboard" },
    { label: "Go to Settings", icon: Settings, action: "/settings" },
  ]},
  { group: "Actions", items: [
    { label: "Create New Scope", icon: Plus, action: "scope" },
    { label: "Create New Doc", icon: FileText, action: "doc" },
    { label: "Search Signals", icon: Search, action: "search" },
    { label: "Run Sync", icon: Zap, action: "sync" },
  ]},
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((action: string) => {
    setOpen(false);
    if (action.startsWith("/")) {
      navigate(action);
    }
    // Non-navigation actions are UI-only stubs
  }, [navigate]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => (
              <CommandItem key={item.label} onSelect={() => handleSelect(item.action)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
