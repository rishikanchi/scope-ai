-- ============================================================
-- CONNECTIONS — per-user OAuth tokens for integrations
-- ============================================================
create table public.connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  provider      text not null,        -- "github", "linear", "slack", "notion", "gmail"
  access_token  text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope         text,                  -- OAuth scopes granted
  metadata      jsonb not null default '{}',  -- provider-specific data (team name, workspace, etc.)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id, provider)
);

create index idx_connections_user on public.connections (user_id);

alter table public.connections enable row level security;

create policy "Users manage own connections" on public.connections
  for all using (auth.uid() = user_id);
