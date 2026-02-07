import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const dataSources = [
  { id: "slack-mobile", label: "#mobile-dev" },
  { id: "slack-eng", label: "#engineering" },
  { id: "slack-product", label: "#product" },
  { id: "linear-eng", label: "Engineering board" },
  { id: "github-backend", label: "scope-app/backend" },
  { id: "notion-prd", label: "PRD workspace" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string) => void;
}

export default function ScopeCreation({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["slack-mobile", "linear-eng"]);

  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Create New Scope</DialogTitle>
          <DialogDescription>Name your initiative and select data sources to monitor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
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
            <Label className="text-xs">Data sources</Label>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {dataSources.map((ds) => (
                <label key={ds.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(ds.id)}
                    onCheckedChange={() => toggle(ds.id)}
                  />
                  <span className="text-xs font-mono-data">{ds.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim()}>
            Create Scope
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
