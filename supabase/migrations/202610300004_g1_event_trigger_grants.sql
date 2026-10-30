-- Hardening for Supabase-managed RLS DDL event trigger.
-- Event trigger is not a client RPC. Prevent implicit PUBLIC EXECUTE grants.
-- Apply to staging first; do not remove or disable the event trigger.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
