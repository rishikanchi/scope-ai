"use client";

import { useState } from "react";
import { ClipboardEdit, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormCardProps } from "@/lib/types";

interface Props extends FormCardProps {
  onSubmit?: (action: string, fields: Record<string, string>) => void;
}

export default function FormCard({ title, description, action, fields, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.name] = field.value;
    }
    return initial;
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    if (onSubmit) {
      onSubmit(action, values);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardEdit className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}

      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                disabled={submitted}
                rows={3}
                className="w-full bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50 resize-none"
              />
            ) : field.type === "select" && field.options ? (
              <select
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                disabled={submitted}
                className="w-full bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                disabled={submitted}
                className="w-full bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        {submitted ? (
          <span className="text-xs text-muted-foreground">Submitted</span>
        ) : (
          <Button size="sm" onClick={handleSubmit} className="gap-1.5">
            <Send className="w-3 h-3" />
            Confirm & Send
          </Button>
        )}
      </div>
    </div>
  );
}
