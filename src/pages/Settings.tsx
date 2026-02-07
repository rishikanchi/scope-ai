import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Command, User, Bell, Palette, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import IntegrationSetup from "@/components/IntegrationSetup";

export default function Settings() {
  const navigate = useNavigate();
  const [intSetup, setIntSetup] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 border-b border-border flex items-center px-6 gap-4">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Command className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Settings</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Profile */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full name</Label>
                <Input defaultValue="Jane Doe" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input defaultValue="jane@company.com" className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input defaultValue="Senior Product Manager" className="h-8 text-sm" />
            </div>
            <Button size="sm">Save changes</Button>
          </div>
        </section>

        <Separator />

        {/* Integrations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Integrations</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIntSetup(true)}>
              Manage
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">6 integrations available. 4 connected.</p>
          </div>
        </section>

        <Separator />

        {/* Notifications */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {[
              { label: "Signal alerts", desc: "Get notified on new incoming signals", on: true },
              { label: "Sync status", desc: "Alerts when orchestration runs complete", on: true },
              { label: "Weekly digest", desc: "Summary of activity across all scopes", on: false },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div>
                  <div className="text-sm">{n.label}</div>
                  <div className="text-xs text-muted-foreground">{n.desc}</div>
                </div>
                <Switch defaultChecked={n.on} />
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Appearance */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Appearance</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Compact mode</div>
                <div className="text-xs text-muted-foreground">Higher information density</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Monospace data</div>
                <div className="text-xs text-muted-foreground">Use monospace font for data fields</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>
      </div>

      <IntegrationSetup open={intSetup} onOpenChange={setIntSetup} onComplete={() => setIntSetup(false)} />
    </div>
  );
}
