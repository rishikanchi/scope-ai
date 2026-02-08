-- Add datasource_id to signals for tracking which datasource sourced each signal
alter table public.signals add column if not exists datasource_id text;
create index if not exists idx_signals_datasource_id on public.signals (datasource_id);

-- Add unique constraint on (scope_id, external_id) for upsert dedup
-- external_id can be null (for webhook signals without dedup), so use a partial index
create unique index if not exists idx_signals_scope_external_unique
  on public.signals (scope_id, external_id) where external_id is not null;
