# Scope

**An AI-powered operating system for Product Managers.**

Scope unifies signal ingestion, analysis, specification drafting, and cross-service action orchestration into a single chat-driven workspace. Connect your tools, ask questions in natural language, and let AI synthesize insights, write specs, and execute actions across your entire stack.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Signal Flow](#signal-flow)
  - [AI Tool Categories](#ai-tool-categories)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Trigger.dev Setup](#triggerdev-setup)
  - [Run the Development Server](#run-the-development-server)
- [Integration Setup](#integration-setup)
- [Project Structure](#project-structure)
- [Background Tasks](#background-tasks)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [Contributing](#contributing)

---

## Overview

Product Managers context-switch constantly — between GitHub issues, Linear tickets, Slack threads, Notion docs, and email. Scope eliminates that by pulling all signals into one place and giving you an AI layer that can reason across all of them simultaneously.

**Three core capabilities:**

- **Synthesize** — AI clusters raw signals into structured insight cards, surfacing themes, severity, and supporting evidence across all connected sources.
- **Draft** — AI writes structured product specifications grounded in live data: problem statements, impact analysis, proposed solutions, and action plans.
- **Orchestrate** — AI stages and executes actions across services in one step: create Linear issues, post Slack messages, write Notion pages — all from a single prompt.

---

## Features

- **Multi-source signal ingestion** via webhooks (real-time) and backfill (on-demand) from GitHub, Linear, Slack, Notion, and Gmail
- **Vector embeddings** on all signals for semantic search (pgvector + IVFFlat indexing)
- **Streaming AI chat** with Server-Sent Events for real-time response rendering
- **Rich UI tool calls** — the AI renders interactive cards (insight clusters, draft specs, action plans, signal tables) directly in the chat
- **Live data queries** — AI fetches fresh data from connected services mid-conversation, not just from the local database
- **Background task orchestration** with Trigger.dev for long-running synthesis, drafting, and action execution
- **Per-user OAuth connections** for all five integrations with automatic token refresh
- **Row-level security** enforced at the database layer — users only access their own data
- **Real-time sidebar updates** via Supabase Realtime WebSocket subscriptions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 18, shadcn/ui, Tailwind CSS, Radix UI |
| AI/LLM | Dedalus Labs SDK (Claude Sonnet), agentic tool-calling, MCP servers |
| Database | Supabase (PostgreSQL, pgvector, Realtime, Auth) |
| Background Jobs | Trigger.dev v4 |
| Data Fetching | TanStack Query v5 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Testing | Vitest + Testing Library |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌──────────────┐  SSE stream   ┌──────────────────────────┐   │
│  │  Chat UI     │◄──────────────│  POST /api/chat           │   │
│  │  Rich Cards  │               │  (streaming, tool-calling)│   │
│  └──────────────┘               └──────────┬───────────────┘   │
│  ┌──────────────┐  WebSocket    │           │                   │
│  │  Sidebar     │◄──────────────┤  Supabase │                   │
│  │  (signals)   │  Realtime     │  Realtime │                   │
│  └──────────────┘               └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │ OAuth / API calls
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Integrations: GitHub · Linear · Slack · Notion · Gmail         │
│                                                                 │
│  Webhooks ──► POST /api/webhooks/[provider]                     │
│               └──► Trigger.dev: ingest-signal task              │
│                    └──► embed + upsert ──► Supabase signals     │
└─────────────────────────────────────────────────────────────────┘
         │ background tasks
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Trigger.dev Tasks                                              │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐              │
│  │  synthesize │  │  draft   │  │  orchestrate │              │
│  │  (LLM+tools)│  │ (LLM+MCP)│  │   (MCP exec) │              │
│  └─────────────┘  └──────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Signal Flow

1. **Ingest** — Webhooks from connected services hit `/api/webhooks/[provider]`, which queues a `ingest-signal` Trigger.dev task. The task normalizes the payload, generates a 1536-dim vector embedding (`text-embedding-3-small`), and upserts the signal into Supabase with deduplication on `(scope_id, external_id)`.
2. **Backfill** — When a datasource is added to a scope, `POST /api/scopes/sync` fetches recent items from the provider API, normalizes them, and bulk-inserts signals.
3. **Realtime** — The browser subscribes to `postgres_changes` on `public.signals` via Supabase Realtime. New signals appear in the sidebar without polling.

### AI Tool Categories

The LLM has four categories of tools available during chat and background tasks:

| Category | Tools |
|---|---|
| **Data** | `search_signals`, `get_signals_by_scope`, `get_artifact`, `update_artifact`, `list_artifacts`, `get_scope_datasources` |
| **UI rendering** | `render_insight_card`, `render_draft_card`, `render_action_plan`, `render_signal_list`, `render_linear_card`, `render_form` — return `{ component, props }` rendered as rich cards in chat |
| **Live queries** | `query_github`, `query_slack`, `query_notion`, `query_gmail`, `query_linear` — fetch fresh data from user's OAuth tokens mid-conversation |
| **Workflow** | `run_synthesis`, `run_orchestration` — trigger background Trigger.dev tasks |

MCP servers (Linear, GitHub, Slack, Notion, Gmail) are used for *write* actions: creating tickets, posting messages, writing docs.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Trigger.dev](https://trigger.dev) account and project
- A [Dedalus Labs](https://dedaluslabs.com) API key
- OAuth apps for each integration you want to enable (see [Integration Setup](#integration-setup))

### Installation

```bash
git clone https://github.com/your-org/scope-ai.git
cd scope-ai
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase ──────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Dedalus Labs (LLM) ────────────────────────────────────────────
DEDALUS_API_KEY=your-dedalus-api-key

# ── App URL (used for OAuth callbacks) ────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── GitHub OAuth ──────────────────────────────────────────────────
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ── Linear OAuth ──────────────────────────────────────────────────
LINEAR_CLIENT_ID=your-linear-client-id
LINEAR_CLIENT_SECRET=your-linear-client-secret

# ── Slack OAuth ───────────────────────────────────────────────────
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# ── Notion OAuth ──────────────────────────────────────────────────
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret

# ── Google / Gmail OAuth ──────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> You only need to configure the OAuth credentials for integrations you intend to use. Unconnected providers are gracefully skipped.

### Database Setup

Run the Supabase migrations against your project. Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Or apply the migration files manually from `supabase/migrations/` in the Supabase dashboard SQL editor, in order:

1. `20250208000000_initial_schema.sql` — Core tables (scopes, signals, artifacts, conversations, messages), pgvector extension, IVFFlat index, RLS policies, `hybrid_search` RPC, Realtime publication
2. `20250208000001_connections.sql` — OAuth connections table
3. `20250208000002_signals_datasource_id.sql` — Datasource tracking index for signal cleanup

### Trigger.dev Setup

1. Create a project at [trigger.dev](https://trigger.dev) and note your project ID.
2. Update `trigger.config.ts` with your project ID if needed.
3. In a separate terminal, run the Trigger.dev dev worker:

```bash
npx trigger.dev@latest dev
```

This connects your local task code to the Trigger.dev cloud for development.

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for an account, connect at least one integration, create a scope with that datasource, and start chatting.

---

## Integration Setup

Each integration requires creating an OAuth application at the provider. Set the **redirect/callback URI** to:

```
{NEXT_PUBLIC_APP_URL}/api/integrations/{provider}/callback
```

| Provider | OAuth App Creation | Required Scopes |
|---|---|---|
| **GitHub** | [github.com/settings/developers](https://github.com/settings/developers) | `repo`, `read:org`, `read:user` |
| **Linear** | [linear.app/settings/api](https://linear.app/settings/api) | `read`, `write` |
| **Slack** | [api.slack.com/apps](https://api.slack.com/apps) | `channels:history`, `channels:read`, `chat:write`, `users:read` |
| **Notion** | [notion.so/my-integrations](https://www.notion.so/my-integrations) | (default integration scopes) |
| **Gmail** | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials | `gmail.readonly`, `gmail.send` |

> **Gmail note:** Enable the Gmail API in your Google Cloud project and add your development email as a test user while the app is in testing mode.

---

## Project Structure

```
scope-ai/
├── app/
│   ├── api/
│   │   ├── chat/              # Streaming chat endpoint + title generation
│   │   ├── integrations/      # OAuth authorize / callback / disconnect / status
│   │   ├── scopes/            # Scope sync (backfill)
│   │   ├── signals/           # Signal listing
│   │   └── webhooks/          # Inbound webhooks (GitHub, Linear, Slack, Notion)
│   ├── auth/                  # Login / signup
│   ├── dashboard/             # Main workspace
│   ├── onboarding/            # First-run integration setup
│   ├── pricing/               # Pricing page
│   ├── settings/              # User profile & integration management
│   └── page.tsx               # Landing page
├── components/
│   ├── dashboard/
│   │   ├── cards/             # InsightCard, DraftCard, ActionPlanCard, SignalListCard, etc.
│   │   ├── Chat.tsx           # Chat interface with SSE streaming
│   │   ├── RichCard.tsx       # Maps { component, props } tool results to React components
│   │   └── Sidebar.tsx        # Signal feed with Realtime subscription
│   └── ui/                    # shadcn/ui base components
├── hooks/                     # use-chat, use-scopes, use-connections, etc.
├── lib/
│   ├── dedalus/
│   │   ├── client.ts          # Dedalus + DedalusRunner initialization
│   │   └── tools/             # Tool definitions: integration, ui, live-query, workflow
│   ├── integrations/          # OAuth provider configs, token refresh logic
│   ├── supabase/              # Browser / server / admin Supabase clients
│   └── types.ts               # Shared TypeScript types
├── trigger/
│   ├── synthesize.ts          # Insight clustering background task
│   ├── draft.ts               # Spec writing background task
│   ├── orchestrate.ts         # Cross-service action execution task
│   ├── ingest-signal.ts       # Webhook signal parsing + embedding task
│   └── backfill-signals.ts    # Bulk datasource sync (called directly from API)
├── supabase/
│   └── migrations/            # Ordered SQL migrations
├── middleware.ts              # Auth redirects (Supabase session validation)
├── trigger.config.ts          # Trigger.dev project configuration
└── package.json
```

---

## Background Tasks

All long-running AI work runs as Trigger.dev tasks so it isn't bound by serverless function timeouts.

| Task | File | Max Duration | Description |
|---|---|---|---|
| `synthesize` | `trigger/synthesize.ts` | 300s | LLM clusters signals into insight cards using data + live query tools. Saves result as an artifact. |
| `draft` | `trigger/draft.ts` | 300s | LLM writes a structured spec (Problem, Impact, Solution, Actions) grounded in signals and live data. |
| `orchestrate` | `trigger/orchestrate.ts` | 300s | Executes staged actions sequentially via MCP servers (create tickets, post messages, write docs). |
| `ingest-signal` | `trigger/ingest-signal.ts` | default | Parses a webhook payload, generates a vector embedding, and upserts the signal. |

Default retry policy: 3 attempts, exponential backoff (factor 2, 1s–10s), jitter enabled.

---

## Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest test suite
npm run test:watch   # Run Vitest in watch mode
```

---

## Deployment

Scope is a standard Next.js 15 application and can be deployed to any platform that supports Node.js and streaming responses (required for SSE chat).

**Recommended platforms:** Vercel, Railway, Render, Fly.io

**Required for deployment:**
- All environment variables from `.env.local` set in your deployment environment
- Trigger.dev tasks deployed: `npx trigger.dev@latest deploy`
- Supabase migrations applied to your production database
- OAuth callback URLs updated to your production domain at each provider

**Streaming note:** Ensure your deployment platform does not buffer SSE responses. On Vercel, streaming is supported natively on the Edge and Node.js runtimes.

---

## Database Schema

```
scopes          — Project containers (user_id, name, description, datasources[])
signals         — Normalized data lake (source, kind, severity, title, body, embedding)
artifacts       — AI-generated outputs (specs, syntheses, drafts)
conversations   — Chat threads per scope
messages        — Chat history (role, content, tool_calls)
connections     — Per-user OAuth tokens (provider, access_token, refresh_token)
```

All tables have Row Level Security enabled. Users can only access data within their own scopes. The `signals` table has a `unique(scope_id, external_id)` constraint for deduplication and an IVFFlat index on `embedding` for vector similarity search.

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with appropriate test coverage.
3. Run `npm run lint` and `npm run test` before submitting.
4. Open a pull request with a clear description of the change.
