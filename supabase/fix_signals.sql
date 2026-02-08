-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This fixes the signals table to support the sync pipeline.

-- 1. Add datasource_id column (if missing)
alter table public.signals add column if not exists datasource_id text;

-- 2. Add index on datasource_id for cleanup queries
create index if not exists idx_signals_datasource on public.signals (datasource_id);

-- 3. Add unique index for dedup on (scope_id, external_id)
create unique index if not exists idx_signals_scope_external_unique
  on public.signals (scope_id, external_id) where external_id is not null;

-- 4. Enable Realtime for signals table (required for live sidebar updates)
alter publication supabase_realtime add table public.signals;
