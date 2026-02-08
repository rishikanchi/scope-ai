import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runner } from "@/lib/dedalus/client";
import { integrationTools } from "@/lib/dedalus/tools/integration";
import { uiTools } from "@/lib/dedalus/tools/ui";
import { createLiveQueryTools } from "@/lib/dedalus/tools/live-query";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { synthesizeTask } from "@/trigger/synthesize";
import type { draftTask } from "@/trigger/draft";
import type { orchestrateTask } from "@/trigger/orchestrate";
import type { ChatMode } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { message, scopeId, conversationId, mode = "chat" } = await req.json() as {
    message: string;
    scopeId: string;
    conversationId: string;
    mode?: ChatMode;
  };

  // 1. Authenticate
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Save user message (skip if no conversationId — workflow modes may not have one yet)
  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });
  }

  // 3. Fetch scope datasources
  const { data: scope } = await supabase
    .from("scopes")
    .select("datasources")
    .eq("id", scopeId)
    .single();
  const datasources = (scope?.datasources as string[]) ?? [];

  // 4. Route by mode
  try {
    switch (mode) {
      case "synthesize":
        return await handleSynthesis(message, scopeId, user.id, datasources);
      case "draft":
        return await handleDraft(message, scopeId, user.id, datasources);
      case "orchestrate":
        return await handleOrchestrate(message, scopeId, user.id, datasources);
      default:
        return await handleChat(message, scopeId, conversationId, user.id, datasources, supabase);
    }
  } catch (err: any) {
    console.error("Chat API error:", err);
    return Response.json(
      { error: err.message ?? "Failed to process request" },
      { status: 500 }
    );
  }
}

// ── Chat Mode ──────────────────────────────────────────────────────────────────

async function handleChat(
  _message: string,
  scopeId: string,
  conversationId: string,
  userId: string,
  datasources: string[],
  supabase: any
) {
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(50);

  const messages = (history ?? []).map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content ?? "",
  }));

  const liveQueryTools = createLiveQueryTools(userId);

  // NO workflow tools in chat mode — they're controlled by the mode dropdown
  const result = await runner.run({
    model: "anthropic/claude-sonnet-4-5-20250929",
    input: messages,
    instructions: SYSTEM_PROMPT(scopeId, datasources),
    tools: [...integrationTools, ...uiTools, ...liveQueryTools] as any,
    stream: false,
    maxSteps: 25,
  });

  return buildSSEResponse(result as any);
}

// ── Synthesize Mode ────────────────────────────────────────────────────────────

async function handleSynthesis(query: string, scopeId: string, userId: string, datasources: string[]) {
  const handle = await tasks.trigger<typeof synthesizeTask>("synthesize", {
    scopeId,
    query: query || "Analyze and synthesize all signals",
    userId,
    datasources: datasources ?? [],
  });

  const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
  const synthStatus = (completed as any).status;
  if (synthStatus === "FAILED" || synthStatus === "CRASHED" || synthStatus === "TIMED_OUT") {
    return buildSSEFromParts(`Synthesis failed: ${(completed as any).error ?? synthStatus}`, []);
  }
  const output = (completed as any).output;

  // The task now returns uiResults directly (InsightCards, SignalList, etc.)
  const uiResults: { component: string; props: Record<string, unknown> }[] = output?.uiResults ?? [];
  const summary = output?.summary ?? "Synthesis complete.";

  return buildSSEFromParts(typeof summary === "string" ? summary : "", uiResults);
}

// ── Draft Mode ─────────────────────────────────────────────────────────────────

async function handleDraft(prompt: string, scopeId: string, userId: string, datasources: string[]) {
  const handle = await tasks.trigger<typeof draftTask>("draft", {
    scopeId,
    prompt: prompt || "Write a product document based on the signals",
    userId,
    datasources: datasources ?? [],
  });

  const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
  const draftStatus = (completed as any).status;
  if (draftStatus === "FAILED" || draftStatus === "CRASHED" || draftStatus === "TIMED_OUT") {
    return buildSSEFromParts(`Draft failed: ${(completed as any).error ?? draftStatus}`, []);
  }
  const output = (completed as any).output;

  // The task returns uiResults (DraftCard, SignalList, etc.)
  const uiResults: { component: string; props: Record<string, unknown> }[] = output?.uiResults ?? [];
  const document = output?.document ?? "";

  // If the task didn't produce UI results, fall back to parsing markdown into a DraftCard
  if (uiResults.length === 0 && typeof document === "string" && document.length > 0) {
    const sections = parseSectionsFromMarkdown(document);
    if (sections.length > 0) {
      uiResults.push({
        component: "draft_card",
        props: { title: `Draft: ${prompt}`, sections, status: "draft", artifactId: output?.artifactId },
      });
    }
  }

  return buildSSEFromParts(
    uiResults.length > 0 ? "" : (typeof document === "string" ? document : JSON.stringify(document)),
    uiResults
  );
}

// ── Orchestrate Mode ───────────────────────────────────────────────────────────

async function handleOrchestrate(
  message: string,
  scopeId: string,
  userId: string,
  datasources: string[]
) {
  // Use LLM to parse natural language into structured actions
  const parseResult = (await runner.run({
    model: "anthropic/claude-sonnet-4-5-20250929",
    input: message,
    instructions: `You are a JSON parser. Convert the user's request into a JSON array of actions.
Each action has: { "service": "linear"|"slack"|"github"|"notion", "action": "create_issue"|"post_message"|"create_issue"|"create_page", "payload": { key: value } }

Available datasources:
${datasources.map((ds) => `- ${ds}`).join("\n")}

Extract the correct IDs from the datasource strings. For example:
- "linear:team:UUID" or "linear:project:UUID" → use the UUID as linear_id
- "github:owner/repo" → use "owner/repo" as repo
- "slack:CHANNEL_ID" → use CHANNEL_ID as channel_id
- "notion:db:UUID" → use UUID as database_id

Respond with ONLY a JSON array. No text before or after.
Example: [{"service":"linear","action":"create_issue","payload":{"linear_id":"abc-123","title":"Fix bug","description":"Details here","priority":"3"}}]`,
    stream: false,
    maxSteps: 1,
  })) as any;

  let actions: any[];
  try {
    const raw = parseResult.finalOutput ?? parseResult.output ?? "[]";
    // Extract JSON from possible markdown code blocks
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    actions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return buildSSEFromParts("I couldn't parse that into actions. Please be more specific about what you'd like to do.", []);
  }

  if (!actions.length) {
    return buildSSEFromParts("No actions identified. Please describe what you'd like to do, e.g. 'Create a Linear issue about updating the command palette'.", []);
  }

  // Show the action plan first as a tool call, then execute
  const planToolCall = {
    component: "action_plan",
    props: {
      actions: actions.map((a: any) => ({
        service: a.service,
        title: a.action,
        description: JSON.stringify(a.payload),
      })),
    },
  };

  // Trigger the orchestration task
  const handle = await tasks.trigger<typeof orchestrateTask>("orchestrate", {
    scopeId,
    userId,
    actions,
  });

  const completed = await runs.poll(handle, { pollIntervalMs: 1000 });
  const output = (completed as any).output;
  const results = output?.results ?? [];

  const summary = results
    .map((r: any) => `- **${r.service}** ${r.action}: ${r.status}`)
    .join("\n");

  return buildSSEFromParts(
    summary || "Orchestration complete.",
    [planToolCall]
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildSSEResponse(runResult: any) {
  const uiToolCalls: { component: string; props: Record<string, unknown> }[] = [];
  for (const tr of runResult.toolResults ?? []) {
    const r = tr.result;
    if (r && typeof r === "object" && "component" in r && "props" in r) {
      uiToolCalls.push({ component: r.component, props: r.props });
    }
  }

  const text = runResult.finalOutput ?? runResult.output ?? "";
  return buildSSEFromParts(text, uiToolCalls);
}

function buildSSEFromParts(
  text: string,
  toolCalls: { component: string; props: Record<string, unknown> }[]
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (text) {
        const sseData = JSON.stringify({ type: "text", content: text });
        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      }
      for (const tc of toolCalls) {
        const sseData = JSON.stringify({ type: "tool_call", component: tc.component, props: tc.props });
        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function parseSectionsFromMarkdown(md: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const lines = md.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }

  return sections;
}

// ── System Prompt (Chat mode only) ─────────────────────────────────────────────

function SYSTEM_PROMPT(scopeId: string, datasources: string[]) {
  const parsedDatasources = datasources.map((ds) => {
    const parts = ds.split(":");
    const provider = parts[0];
    if (provider === "linear") {
      return `- **linear** ${parts[1]}: id=\`${parts[2]}\``;
    }
    if (provider === "notion") {
      return `- **notion** ${parts[1]}: id=\`${parts[2]}\``;
    }
    return `- **${provider}**: \`${parts.slice(1).join(":")}\``;
  });
  const datasourcesList = parsedDatasources.length > 0
    ? parsedDatasources.join("\n")
    : "No datasources configured.";

  return `You are Scope, an AI-powered product management assistant. You ALWAYS prefer taking action via tool calls over responding with plain text. If a user request can be fulfilled by calling a tool, call the tool first, then summarize.

## Current Scope ID: ${scopeId}

## Datasources in This Scope
${datasourcesList}

You already know what datasources are available. NEVER ask the user which repo, channel, or page to look at — use the datasources listed above and start working immediately.

---

## DATA TOOLS (query signals & artifacts)

| Tool | Args | Use when |
|------|------|----------|
| **search_signals** | scope_id, query | Searching signals by keyword or topic |
| **get_signals_by_scope** | scope_id, source? | Listing all signals (optionally filtered by source: github, slack, linear, notion, gmail) |
| **get_artifact** | artifact_id | Reading a specific artifact (synthesis, draft, etc.) |
| **update_artifact** | artifact_id, title?, content?, status? | Editing an artifact's title, content, or status |
| **list_artifacts** | scope_id, kind? | Listing artifacts (filter by kind: synthesis, draft, orchestration) |
| **get_scope_datasources** | scope_id | List all datasources configured for the scope |

---

## UI TOOLS (render rich cards inline)

| Tool | Args | Use when |
|------|------|----------|
| **render_insight_card** | title, description, severity (high/medium/low), signal_count, evidence_json? (JSON array of {source, title, severity}) | Displaying a single insight with inline evidence |
| **render_linear_card** | ticket_id, title, status, assignee?, priority? | Displaying a Linear ticket |
| **render_signal_list** | signals[] (each: source, title, severity?) | Displaying a list of signals |
| **render_action_plan** | actions[] (each: service, title, description, payload?) | Displaying a plan of cross-service actions before executing |
| **render_draft_card** | title, sections[] (each: heading, content), status?, artifact_id? | Displaying a structured document with collapsible sections |
| **render_form** | title, description?, action (write tool name), fields_json (JSON array of {name, label, value, type?, options?}) | **REQUIRED before any write action.** Shows an editable form for user to review and confirm before executing. |

ALWAYS use UI tools to display results visually. Never dump raw data as text when a card exists for it.

---

## LIVE TOOLS (query & write to external services directly)

### Read
| Tool | Args | Use when |
|------|------|----------|
| **query_github** | repo (owner/name), endpoint (commits/pulls/issues/readme/tree/contents/{path}) | Querying GitHub repos live — get commits, file contents, README, PRs, issues, file tree |
| **query_slack** | channel_id, query? | Searching Slack messages in a channel, optionally filtered by text |
| **query_notion** | page_id | Reading full content of a Notion page |

### Write
| Tool | Args | Use when |
|------|------|----------|
| **create_linear_issue** | linear_id, title, description, priority? (0-4) | Creating a new Linear issue. Pass the \`id\` value from any linear datasource above (team or project — both work, project IDs are auto-resolved to teams). |
| **post_slack_message** | channel_id, text | Posting a message to a Slack channel |
| **create_github_issue** | repo (owner/name), title, body | Creating a new issue on a GitHub repo |
| **create_notion_page** | database_id, title, content | Creating a new page in a Notion database. Use the \`id\` value from a notion db datasource above. |

Use these to interact with APIs directly using the user's connected accounts. You know the repos/channels/teams from the Datasources list above — use them directly.

**IMPORTANT: NEVER call write tools directly.** Always call render_form first to show the user a confirmation form. Only execute the write tool after the user confirms (their message will start with "CONFIRMED:").

---

## IMPORTANT

Synthesis, drafting, and orchestration workflows are NOT available in chat mode. They are triggered separately via the mode selector in the chat bar. Do NOT try to run these yourself.

---

## RULES

1. **Tools first, text second.** If a request can be answered by calling a tool, call the tool. Don't say "I can do that" — just do it.
2. **Never ask which repo/channel/page/team.** You already know the datasources. Extract the \`id\` values and use them directly.
3. **NEVER write without confirmation.** For ANY write action (create issue, post message, create page), you MUST first call render_form with pre-filled values. The user will review, edit if needed, and click Confirm. Only after seeing a "CONFIRMED:" message should you call the actual write tool (create_linear_issue, post_slack_message, etc).
4. **Always render results visually.** After fetching data or completing a task, use the appropriate render_* tool to display results as rich cards.
5. **Use live query tools for research.** When the user says "research my codebase" or "look at my GitHub", use query_github with the repos from the datasources list.
6. **Use data tools for signal lookups.** For questions about signals, search_signals or get_signals_by_scope.
7. **No data is not an error.** If get_signals_by_scope returns 0 signals for a source, say "No signals found from [source] yet" — do NOT say there was an error or technical issue. Then try using live query tools to fetch data directly.
8. **Be concise.** Use bullet points. Don't repeat data that's already shown in a rendered card.`;
}
