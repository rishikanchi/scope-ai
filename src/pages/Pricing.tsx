import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntegrationSetup from "@/components/IntegrationSetup";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["1 Scope", "3 Integrations", "100 Signals/mo", "Community support"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    features: ["Unlimited Scopes", "All 6 Integrations", "Unlimited Signals", "AI Copilot", "Priority support"],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Everything in Pro", "SSO & SAML", "Dedicated instance", "Custom integrations", "SLA & onboarding"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);

  const handleSelect = () => {
    setShowSetup(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Command className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Scope</span>
        </div>

        <h1 className="text-3xl font-bold mt-8 mb-2">Choose your plan</h1>
        <p className="text-muted-foreground mb-10">Start free and scale as your team grows.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted ? "border-primary bg-card glow-primary-sm" : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs font-semibold text-primary mb-2">Most popular</span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-signal-green shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full"
                onClick={handleSelect}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <IntegrationSetup open={showSetup} onOpenChange={setShowSetup} onComplete={() => navigate("/dashboard")} />
    </div>
  );
}
