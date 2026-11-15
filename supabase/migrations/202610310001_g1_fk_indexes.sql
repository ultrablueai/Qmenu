-- G1 performance: cover both foreign keys reported by Supabase advisor.
-- Apply only after the initial four G1 migrations. Safe on fresh staging.
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);
create index if not exists subscriptions_plan_id_idx
  on public.subscriptions (plan_id);
