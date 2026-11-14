-- G14: Read-only, non-PII commercial operations preflight for platform admins.
-- Counts are live Staging signals, not compliance or billing certification.
create or replace function public.g14_platform_launch_preflight()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_plans bigint;v_active_plans bigint;v_subscriptions bigint;
 v_current_trials bigint;v_expired_periods bigint;
 v_pending_reviews bigint;v_pending_staff_invites bigint;
 v_total_businesses bigint;v_total_branches bigint;
begin
 if auth.uid() is null or not exists (
  select 1 from public.platform_admins a
  where a.user_id=auth.uid() and a.enabled=true
    and a.role in ('platform_owner','platform_operator')
 ) then
  raise exception 'Platform preflight forbidden' using errcode='42501';
 end if;

 select count(*),count(*) filter(where p.active)
 into v_plans,v_active_plans from public.plans p;
 select count(*),
  count(*) filter(where s.status='trial' and s.starts_at<=now() and s.ends_at>now()),
  count(*) filter(where s.ends_at is not null and s.ends_at<=now())
 into v_subscriptions,v_current_trials,v_expired_periods from public.subscriptions s;
 select count(*) into v_pending_reviews
 from public.g13_subscription_requests r where r.status='pending';
 select count(*) into v_pending_staff_invites
 from public.g11_staff_invitations i where i.accepted_at is null
 and i.revoked_at is null and i.expires_at>now();
 select count(*) into v_total_businesses from public.businesses;
 select count(*) into v_total_branches from public.branches;

 return pg_catalog.jsonb_build_object(
  'checked_at',now(),
  'businesses',v_total_businesses,
  'branches',v_total_branches,
  'plans',v_plans,
  'active_plans',v_active_plans,
  'subscription_records',v_subscriptions,
  'current_trials',v_current_trials,
  'elapsed_subscription_periods',v_expired_periods,
  'pending_subscription_reviews',v_pending_reviews,
  'pending_staff_invitations',v_pending_staff_invites,
  'commercial_go',false,
  'billing_live',false
 );
end $$;

revoke all on function public.g14_platform_launch_preflight() from public,anon,authenticated;
grant execute on function public.g14_platform_launch_preflight() to authenticated;
