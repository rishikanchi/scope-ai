"use client";

import { useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { DraftCardProps } from "@/lib/types";

export default function DraftCard({ title, sections, status, artifactId }: DraftCardProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => {
    setCollapsed((c) => ({ ...c, [i]: !c[i] }));
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold flex-1 truncate">{title}</h3>
        <span className={`text-[10px] font-mono-data px-2 py-0.5 rounded-full ${
          status === "final"
            ? "bg-signal-green/20 text-signal-green"
            : "bg-signal-yellow/20 text-signal-yellow"
        }`}>
          {status === "final" ? "Final" : "Draft"}
        </span>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border">
        {sections.map((section, i) => {
          const isCollapsed = !!collapsed[i];

          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
              >
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${isCollapsed ? "" : "rotate-90"}`} />
                <span className="text-xs font-semibold text-foreground">{section.heading}</span>
              </button>
              {!isCollapsed && (
                <div className="px-4 pb-3 pl-9">
                  <div className="prose prose-sm prose-invert max-w-none
                    prose-p:my-1 prose-p:leading-relaxed prose-p:text-muted-foreground
                    prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:text-muted-foreground
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-code:text-xs prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {artifactId && (
        <div className="px-4 py-2 border-t border-border">
          <span className="text-[10px] font-mono-data text-muted-foreground">
            Artifact: {artifactId.slice(0, 8)}
          </span>
        </div>
      )}
    </div>
  );
}
