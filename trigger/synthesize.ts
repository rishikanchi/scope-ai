import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { runner } from "@/lib/dedalus/client";
import { integrationTools } from "@/lib/dedalus/tools/integration";
import { uiTools } from "@/lib/dedalus/tools/ui";
import { createLiveQueryTools } from "@/lib/dedalus/tools/live-query";
import { createAdminClient } from "@/lib/supabase/admin";

export const synthesizeTask = schemaTask({
  id: "synthesize",
  schema: z.object({
    scopeId: z.string().uuid(),
    query: z.string().default("Analyze and synthesize all signals"),
    userId: z.string().uuid(),
    datasources: z.array(z.string()).default([]),
  }),
  maxDuration: 300,
  run: async ({ scopeId, query, userId, datasources }) => {
    const liveTools = createLiveQueryTools(userId);

    // Build datasource context for the prompt
    const dsContext = datasources.length > 0
      ? datasources.map((ds) => `- ${ds}`).join("\n")
      : "No datasources configured.";

    const result = (await runner.run({
      model: "anthropic/claude-sonnet-4-5-20250929",
      input: query,
      instructions: `You are Scope's synthesis engine. Perform a comprehensive analysis for scope ${scopeId}.

## Available Datasources
${dsContext}

## Your Process

1. **Gather signals**: Call get_signals_by_scope with scope_id="${scopeId}" to get all stored signals.
2. **Query integrations live**: Go deeper by using live query tools to pull fresh data:
   - For GitHub repos: call query_github with the repo from datasources (e.g. "owner/repo") and endpoints like "issues", "pulls", "commits" to get the latest activity
   - For Slack channels: call query_slack with the channel_id to see recent conversations
   - For Notion pages: call query_notion with page IDs to read document content
3. **Analyze everything**: Combine signals AND live data. Group findings into thematic clusters (e.g. "Authentication Issues", "Performance Gaps", "Feature Requests", "Technical Debt").
4. **Render insights with evidence**: For EACH cluster, call render_insight_card with:
   - title: A clear title summarizing the theme
   - description: A detailed description (3-5 sentences) explaining the pattern, why it matters, and what to do about it
   - severity: "high" if blocking/critical, "medium" if important, "low" if minor
   - signal_count: how many signals/data points contribute to this cluster
   - evidence_json: A JSON array of the specific signals/data that back this insight. Each item has:
     - source: "github", "slack", "linear", "notion", etc.
     - title: The exact name of the issue, PR, commit message, Slack message, or signal (e.g. "PR #42: Fix auth flow", "Issue: Login timeout on mobile")
     - severity: "high", "medium", or "low"
   Evidence can be reused across multiple insight cards if a signal contributes to multiple themes.
5. **Summarize**: End with a brief text summary of overall findings and recommended priorities.

IMPORTANT: Do NOT call render_signal_list separately. Instead, include all evidence INLINE with each insight card using the evidence_json parameter. This way each insight shows exactly where it comes from.

Be thorough and specific. Reference exact issue titles, PR names, commit messages, and Slack messages.`,
      tools: [...integrationTools, ...uiTools, ...liveTools] as any,
      maxSteps: 12,
    })) as any;

    // Extract UI tool results (insight cards, signal lists)
    const uiResults: { component: string; props: Record<string, any> }[] = [];
    for (const tr of result.toolResults ?? []) {
      const r = tr.result;
      if (r && typeof r === "object" && "component" in r && "props" in r) {
        uiResults.push({ component: r.component, props: r.props });
      }
    }

    // Save artifact to Supabase
    const supabase = createAdminClient();
    const { data: artifact } = await supabase
      .from("artifacts")
      .insert({
        scope_id: scopeId,
        kind: "synthesis",
        title: `Synthesis: ${query}`,
        content: { summary: result.output, uiResults, query },
        status: "draft",
      })
      .select("id")
      .single();

    return {
      artifactId: artifact?.id,
      summary: result.output,
      uiResults,
      toolsCalled: result.toolsCalled,
    };
  },
});
