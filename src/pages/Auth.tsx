import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/pricing");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Command className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl">Scope</span>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="login" className="flex-1">Log in</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="pm@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Log in</Button>
              <p className="text-xs text-center text-muted-foreground">
                <button type="button" className="text-primary hover:underline">Forgot password?</button>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full">Create account</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
