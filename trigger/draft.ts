import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { runner } from "@/lib/dedalus/client";
import { integrationTools } from "@/lib/dedalus/tools/integration";
import { uiTools } from "@/lib/dedalus/tools/ui";
import { createLiveQueryTools } from "@/lib/dedalus/tools/live-query";
import { createAdminClient } from "@/lib/supabase/admin";

export const draftTask = schemaTask({
  id: "draft",
  schema: z.object({
    scopeId: z.string().uuid(),
    prompt: z.string().default("Write a product document based on the signals"),
    userId: z.string().uuid(),
    datasources: z.array(z.string()).default([]),
  }),
  maxDuration: 300,
  run: async ({ scopeId, prompt, userId, datasources }) => {
    const liveTools = createLiveQueryTools(userId);

    const dsContext = datasources.length > 0
      ? datasources.map((ds) => `- ${ds}`).join("\n")
      : "No datasources configured.";

    const result = (await runner.run({
      model: "anthropic/claude-sonnet-4-5-20250929",
      input: prompt,
      instructions: `You are Scope's drafting engine. Write a comprehensive, structured product document for scope ${scopeId}.

## Available Datasources
${dsContext}

## Your Process

1. **Gather context from signals**: Use get_signals_by_scope and search_signals to find relevant stored data.
2. **Query integrations live for deeper context**:
   - For GitHub repos: call query_github with endpoints like "issues", "pulls", "commits", "readme" to get current state, recent activity, codebase context
   - For Slack channels: call query_slack to understand team discussions and decisions
   - For Notion: call query_notion to read existing documentation and specs
3. **Write the document**: Use render_draft_card with comprehensive, detailed sections. Each section should be thorough (several paragraphs, not just bullet points).

The document MUST have these sections:
- **Problem Statement**: What problem are we solving? Reference specific issues, PRs, Slack discussions, and signals by name.
- **Current State**: What does the system/process look like today? Pull from GitHub code, README, existing Notion docs.
- **Impact**: Who is affected and how? Include data points from signals and live data.
- **Proposed Solution**: Concrete technical or product approach. Be specific about implementation.
- **Action Items**: Specific next steps. For each, note which service it applies to (Linear issue, GitHub PR, Slack thread, etc).

4. **Show your sources**: Call render_signal_list with the signals you referenced.

Be thorough. Each section should be 1-3 paragraphs. Ground every claim in actual data from signals and live queries.`,
      tools: [...integrationTools, ...uiTools, ...liveTools] as any,
      maxSteps: 12,
    })) as any;

    // Extract UI tool results
    const uiResults: { component: string; props: Record<string, any> }[] = [];
    for (const tr of result.toolResults ?? []) {
      const r = tr.result;
      if (r && typeof r === "object" && "component" in r && "props" in r) {
        uiResults.push({ component: r.component, props: r.props });
      }
    }

    // Save artifact
    const supabase = createAdminClient();
    const { data: artifact } = await supabase
      .from("artifacts")
      .insert({
        scope_id: scopeId,
        kind: "draft",
        title: `Draft: ${prompt}`,
        content: { document: result.output, uiResults, prompt },
        status: "draft",
      })
      .select("id")
      .single();

    return {
      artifactId: artifact?.id,
      document: result.output,
      uiResults,
      toolsCalled: result.toolsCalled,
    };
  },
});
