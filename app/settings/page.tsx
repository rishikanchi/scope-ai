"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, User, Bell, Palette, Shield, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import IntegrationSetup from "@/components/IntegrationSetup";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

export default function Settings() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [intSetup, setIntSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [nameInitialized, setNameInitialized] = useState(false);

  // Initialize form values from user data once loaded
  if (user && !nameInitialized) {
    setFullName(user.user_metadata?.full_name ?? "");
    setRole(user.user_metadata?.role ?? "");
    setNameInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { full_name: fullName, role },
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 border-b border-border flex items-center px-6 gap-4">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3 h-3" /> Dashboard
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Image src="/scope_logo.png" alt="Scope" width={24} height={24} className="rounded" />
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
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={user?.email ?? ""} disabled className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Product Manager"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
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

        <Separator />

        {/* Sign Out */}
        <section>
          <Button variant="destructive" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </section>
      </div>

      <IntegrationSetup open={intSetup} onOpenChange={setIntSetup} onComplete={() => setIntSetup(false)} />
    </div>
  );
}
