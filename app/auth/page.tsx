"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

export default function Auth() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, session will be null
    if (!data.session) {
      setError(null);
      setMessage("Check your email for a confirmation link, then log in.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>

        <div className="flex items-center gap-2 mb-8">
          <Image src="/scope_logo.png" alt="Scope" width={32} height={32} className="rounded-md" />
          <span className="font-semibold text-xl">Scope</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 text-sm text-primary">
            {message}
          </div>
        )}

        <Tabs defaultValue="login" onValueChange={() => { setError(null); setMessage(null); }}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="login" className="flex-1">Log in</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="pm@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log in
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                <button type="button" className="text-primary hover:underline">Forgot password?</button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full name</Label>
                <Input id="signup-name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="pm@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
