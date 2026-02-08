-- Enable pgvector
create extension if not exists vector with schema extensions;

-- ============================================================
-- SCOPES — a project/initiative container
-- ============================================================
create table public.scopes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  description text,
  datasources jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SIGNALS — heterogeneous data lake
-- ============================================================
create table public.signals (
  id            uuid primary key default gen_random_uuid(),
  scope_id      uuid not null references public.scopes(id) on delete cascade,

  -- Classification
  source        text not null,
  kind          text not null,
  severity      text,

  -- Content
  title         text,
  body          text,
  url           text,

  -- Metadata (flexible per-source schema)
  metadata      jsonb not null default '{}',

  -- External identity (for dedup on re-sync)
  external_id   text,

  -- Which datasource produced this signal (for cleanup on datasource removal)
  datasource_id text,

  -- Vector embedding for semantic search
  embedding     extensions.vector(1536),

  -- Timestamps
  source_ts     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for hybrid search
create index idx_signals_scope    on public.signals (scope_id);
create index idx_signals_source   on public.signals (source, kind);
create index idx_signals_ext_id   on public.signals (external_id);
create index idx_signals_datasource on public.signals (datasource_id);
create unique index idx_signals_scope_external_unique
  on public.signals (scope_id, external_id) where external_id is not null;
create index idx_signals_embedding on public.signals
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- ============================================================
-- ARTIFACTS — specs, plans, synthesis results
-- ============================================================
create table public.artifacts (
  id          uuid primary key default gen_random_uuid(),
  scope_id    uuid not null references public.scopes(id) on delete cascade,
  kind        text not null,
  title       text not null,
  content     jsonb not null default '{}',
  signal_ids  uuid[] not null default '{}',
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_artifacts_scope on public.artifacts (scope_id);

-- ============================================================
-- CONVERSATIONS — chat history per scope
-- ============================================================
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  scope_id    uuid not null references public.scopes(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now()
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null,
  content         text,
  tool_calls      jsonb,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- RPC: Hybrid search function
-- ============================================================
create or replace function hybrid_search(
  p_scope_id    uuid,
  p_query_embedding extensions.vector(1536),
  p_filter_source text default null,
  p_filter_kind   text default null,
  p_limit       int default 20,
  p_similarity  float default 0.5
)
returns table (
  id         uuid,
  source     text,
  kind       text,
  title      text,
  body       text,
  url        text,
  metadata   jsonb,
  severity   text,
  similarity float
)
language plpgsql as $$
begin
  return query
    select
      s.id, s.source, s.kind, s.title, s.body, s.url,
      s.metadata, s.severity,
      1 - (s.embedding <=> p_query_embedding) as similarity
    from public.signals s
    where s.scope_id = p_scope_id
      and s.embedding is not null
      and (p_filter_source is null or s.source = p_filter_source)
      and (p_filter_kind is null or s.kind = p_filter_kind)
      and 1 - (s.embedding <=> p_query_embedding) >= p_similarity
    order by s.embedding <=> p_query_embedding
    limit p_limit;
end;
$$;

-- Row Level Security
alter table public.scopes enable row level security;
alter table public.signals enable row level security;
alter table public.artifacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users manage own scopes" on public.scopes
  for all using (auth.uid() = user_id);

create policy "Users access signals in own scopes" on public.signals
  for all using (scope_id in (select id from public.scopes where user_id = auth.uid()));

create policy "Users access artifacts in own scopes" on public.artifacts
  for all using (scope_id in (select id from public.scopes where user_id = auth.uid()));

create policy "Users access conversations in own scopes" on public.conversations
  for all using (scope_id in (select id from public.scopes where user_id = auth.uid()));

create policy "Users access messages in own conversations" on public.messages
  for all using (conversation_id in (
    select c.id from public.conversations c
    join public.scopes s on c.scope_id = s.id
    where s.user_id = auth.uid()
  ));

-- Realtime: enable postgres_changes for signals so the sidebar updates live
alter publication supabase_realtime add table public.signals;
