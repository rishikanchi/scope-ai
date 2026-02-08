import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLiveQueryTools } from "@/lib/dedalus/tools/live-query";
import { integrationTools } from "@/lib/dedalus/tools/integration";
import { runner } from "@/lib/dedalus/client";

export const orchestrateTask = schemaTask({
  id: "orchestrate",
  schema: z.object({
    scopeId: z.string().uuid(),
    userId: z.string().uuid(),
    actions: z.array(
      z.object({
        service: z.string(),
        action: z.string(),
        payload: z.record(z.string()),
      })
    ),
  }),
  maxDuration: 300,
  run: async ({ scopeId, userId, actions }) => {
    // Live tools for writing AND reading context, integration tools for signals
    const liveTools = createLiveQueryTools(userId);
    const results = [];

    for (const action of actions) {
      const result = await runner.run({
        model: "anthropic/claude-sonnet-4-5-20250929",
        input: `Execute this action on ${action.service}: ${action.action}. Payload: ${JSON.stringify(action.payload)}`,
        instructions: `You are Scope's orchestration engine. Execute the requested action using the available tools.

You have tools to:
- Create Linear issues (create_linear_issue)
- Post Slack messages (post_slack_message)
- Create GitHub issues (create_github_issue)
- Create Notion pages (create_notion_page)
- Query GitHub, Slack, Notion for context (query_github, query_slack, query_notion)
- Search signals for background context (search_signals, get_signals_by_scope)

Before executing the write action, you may use query/search tools to gather context that improves the output. For example, if creating a GitHub issue, you might check recent commits or existing issues first to write a better description.

Then execute the write action. Use the correct tool for the service requested.`,
        tools: [...liveTools, ...integrationTools] as any,
        maxSteps: 8,
      });

      results.push({
        action: action.action,
        service: action.service,
        status: "completed",
        output: (result as any).output,
      });
    }

    // Save artifact to Supabase
    const supabase = createAdminClient();
    const { data: artifact } = await supabase
      .from("artifacts")
      .insert({
        scope_id: scopeId,
        kind: "orchestration_plan",
        title: `Orchestration: ${actions.length} actions`,
        content: { actions, results },
        status: "executed",
      })
      .select("id")
      .single();

    return { artifactId: artifact?.id, results };
  },
});
