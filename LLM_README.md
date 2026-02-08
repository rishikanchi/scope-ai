# Scope AI — LLM Architecture

## Core SDK: Dedalus Labs

Two objects are created in `lib/dedalus/client.ts`:

- **`dedalus`** — raw Dedalus client (OpenAI-compatible API). Used for low-level calls like `dedalus.embeddings.create()` in the ingest-signal task.
- **`runner`** — `DedalusRunner` instance. This is the agentic wrapper. It handles multi-step tool calling, streaming, and MCP server connections. Every LLM interaction except embeddings goes through `runner.run()`.

The model used everywhere is `anthropic/claude-sonnet-4-5-20250929` — Dedalus routes to Claude via their API key.

---

## Three LLM Entry Points

### 1. Chat (`/api/chat/route.ts`) — the main one

```
User message → save to DB → load last 50 messages → runner.run(streaming)
```

The runner gets:
- `model`: Claude Sonnet 4.5
- `input`: full conversation history (user/assistant pairs)
- `instructions`: system prompt with scope ID and capability descriptions
- `tools`: 12 local tools + 3 workflow tools (15 total)
- `mcpServers`: 5 remote MCP servers (Linear, GitHub, Slack, Notion, Gmail)
- `stream: true` — returns an async iterable of chunks
- `maxSteps: 25` — agent can make up to 25 tool calls in a single turn

The streaming output is converted to SSE and sent to the browser.

### 2. Title generation (`/api/chat/title/route.ts`) — lightweight

```
First message → runner.run(non-streaming, maxSteps=1) → extract title → update DB
```

No tools, no MCP servers. Just a single LLM call to generate a 3-6 word title.

### 3. Synthesis task (`trigger/synthesize.ts`) — background

```
run_synthesis tool call → Trigger.dev task → runner.run(non-streaming, maxSteps=15)
```

Runs in Trigger.dev's infrastructure with a 120s timeout. Has its own system prompt focused on clustering signals into insight groups.

### 4. Drafting task (`trigger/draft.ts`) — background

```
run_drafting tool call → Trigger.dev task → runner.run(non-streaming, maxSteps=15)
```

Runs in Trigger.dev with a 120s timeout. System prompt instructs the agent to search signals for context, then produce a structured document with sections (Problem Statement, Impact, Proposed Solution, Action Items). Saves artifact with `kind: "draft"`.

---

## The 13 Local Tools

The LLM can call these functions directly. They run server-side in the Next.js process.

### Integration tools (5) — database queries via Supabase admin client

| Tool | What it does |
|---|---|
| `search_signals` | Text search signals by title (`ILIKE %query%`). Currently placeholder — should use vector embeddings via `hybrid_search` RPC. |
| `get_signals_by_scope` | Get latest 50 signals for a scope, optionally filtered by source. |
| `get_artifact` | Fetch a single artifact by ID. |
| `update_artifact` | Update an artifact's title, content, or status. |
| `list_artifacts` | List latest 20 artifacts for a scope, optionally filtered by kind. |

### UI tools (4) — return `{ component, props }` objects that render as cards in chat

| Tool | Returns | Frontend component |
|---|---|---|
| `render_insight_card` | severity + title + description + signal count | `InsightCard` |
| `render_linear_card` | ticket ID + title + status + assignee | `LinearCard` |
| `render_signal_list` | list of signals with source/severity | `SignalListCard` |
| `render_action_plan` | ordered action steps with service names | `ActionPlanCard` |

These tools don't execute anything — they just return structured data. The return value flows through SSE to the browser, where `RichCard.tsx` maps the component name to a React component.

### Workflow tools (2) — trigger long-running Trigger.dev background jobs

| Tool | What it does |
|---|---|
| `run_synthesis` | Triggers `synthesize` Trigger.dev task, polls until complete, returns results. The synthesis task itself runs another LLM call with its own tools. |
| `run_orchestration` | Triggers `orchestrate` Trigger.dev task. Iterates through actions, each running an LLM call to execute via MCP servers. |

These are created per-request via `createWorkflowTools(scopeId, userId)` to scope them.

---

## The 5 MCP Servers

```ts
export const MCP_SERVERS = ["linear", "github", "slack", "notion", "gmail"];
```

These are remote MCP (Model Context Protocol) servers registered with Dedalus. They give Claude direct access to:

- **Linear**: Create/update issues, search issues, manage projects
- **GitHub**: Create issues/PRs, search repos, manage branches
- **Slack**: Send messages, search channels, list users
- **Notion**: Create/update pages, search databases
- **Gmail**: Send emails, search threads

Auth is handled at the Dedalus platform level (not per-user). When Claude calls an MCP tool like "create a Linear issue", Dedalus routes it through the MCP server which uses the platform's credentials.

**Important distinction**: MCP servers are for the AI to *act* (create tickets, send messages). The local integration tools are for the AI to *read* (query your Supabase database). The OAuth tokens in the `connections` table are used for the backfill/webhook flows, not for MCP.

---

## The Streaming Pipeline

```
Browser                    Server                      Dedalus
  |                          |                            |
  |--POST /api/chat--------->|                            |
  |                          |--runner.run(stream:true)--->|
  |                          |                            |
  |                          |<--AsyncIterable<chunk>-----|
  |                          |                            |
  |  for await (chunk) {     |                            |
  |    if text delta:        |                            |
  |<-----SSE {type:"text"}---|                            |
  |    if tool_call result:  |                            |
  |<-----SSE {type:"tool_call", component, props}---------|
  |  }                       |                            |
  |<-----SSE [DONE]----------|                            |
  |                          |                            |
  |--save assistant msg to DB|                            |
```

Chunks have OpenAI-compatible shape: `chunk.choices[0].delta.content` for text, `chunk.choices[0].delta.tool_calls` for tool calls.

The tool call detection in the streaming code checks if the parsed arguments contain `component` and `props` — this is how it distinguishes UI tool calls (which should be sent to the browser) from data tool calls (which are internal).

---

## The Signal Ingestion Pipeline

```
Webhook (GitHub/Linear/Slack/etc.)
  |
  |--POST /api/webhooks/[provider]
  |
  |--Trigger.dev: ingest-signal task
  |   |--parseWebhookPayload() -> normalize to signal shape
  |   |--dedalus.embeddings.create() -> 1536-dim vector
  |   |--supabase.upsert(signal + embedding)
  |
  |--Signal appears in sidebar via Supabase Realtime
```

Each provider's webhook payload is normalized into a common shape: `{ kind, severity, title, body, url, metadata, external_id, source_ts }`. The embedding is generated via Dedalus's OpenAI-compatible embeddings API (`text-embedding-3-small`).

---

## Signal Backfill Pipeline

```
Scope create/update
  |
  |--POST /api/scopes/sync
  |   |--addedDatasources: fetch recent items from each provider API
  |   |  (GitHub issues/PRs, Slack messages, Linear issues, Notion pages, Gmail emails)
  |   |--removedDatasources: delete signals with matching datasource_id
  |   |--Insert signals via admin client (bypasses RLS)
  |
  |--Signals appear in sidebar via Supabase Realtime subscription
```

Runs directly in the API route (no Trigger.dev dependency). Each signal gets a `datasource_id` so it can be cleaned up when a datasource is removed from a scope.

---

## How the Agent Decides What to Do

The system prompt in `SYSTEM_PROMPT(scopeId)` tells Claude its capabilities and rules:

1. **Simple lookups** — use `search_signals` or `get_signals_by_scope` directly
2. **Complex analysis** — call `run_synthesis` (which spawns a background LLM that clusters signals and generates insight cards)
3. **Execute actions** — call `run_orchestration` (which spawns background LLMs that use MCP servers to create tickets, send messages, etc.)
4. **Display data** — call UI tools (`render_insight_card`, etc.) to show rich cards inline
5. **Edit previous work** — use `get_artifact` + `update_artifact`

The agent can chain up to 25 steps per turn — meaning it can search signals, analyze results, render cards, and summarize all in one response.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/dedalus/client.ts` | Dedalus client + runner initialization |
| `lib/dedalus/tools/integration.ts` | 5 database query tools + MCP server list |
| `lib/dedalus/tools/ui.ts` | 4 UI card rendering tools |
| `lib/dedalus/tools/workflow.ts` | 2 workflow tools (synthesis + orchestration) |
| `app/api/chat/route.ts` | Main chat endpoint, streaming SSE |
| `app/api/chat/title/route.ts` | AI title generation for conversations |
| `app/api/scopes/sync/route.ts` | Signal backfill on scope create/update |
| `trigger/synthesize.ts` | Background synthesis task (Trigger.dev) |
| `trigger/orchestrate.ts` | Background orchestration task (Trigger.dev) |
| `trigger/ingest-signal.ts` | Webhook signal ingestion + embedding (Trigger.dev) |
| `hooks/use-chat.ts` | Client-side SSE stream parser |
| `components/dashboard/RichCard.tsx` | Maps component names to React card components |

---

## Current Limitations

1. **`search_signals` is text-only** — does `ILIKE %query%` instead of using the vector embeddings and `hybrid_search` RPC function that's already defined in the schema.

2. **MCP server auth is platform-level** — the MCP servers use Dedalus's credentials, not the user's OAuth tokens. So if Claude creates a Linear issue via MCP, it's created as the Dedalus platform user, not the logged-in user.

3. **No tool call result streaming** — when the agent calls a data tool (like `search_signals`), the result isn't streamed to the browser. Only UI tool results (with `component`/`props`) are forwarded. The agent processes data tool results internally and includes them in its text response.

4. **Orchestration is sequential** — `orchestrate.ts` runs each action one at a time with a separate LLM call per action, rather than batching them.
