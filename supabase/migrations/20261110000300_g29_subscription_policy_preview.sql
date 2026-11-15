-- G29 merchant subscription lifecycle preview. Read-only, never grants entitlements or billing.
-- Staging only; NOT a paid subscription activation.
create or replace function public.beger_g29_merchant_subscription_preview(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_state text; v_start timestamptz; v_end timestamptz; v_plan text; v_trial_end timestamptz;
begin
 if (select auth.uid()) is null or p_business is null or not exists (
  select 1 from public.memberships m where m.business_id=p_business
   and m.user_id=(select auth.uid()) and m.role in ('owner','manager')
 ) then
  raise exception 'Subscription preview forbidden' using errcode='42501';
 end if;
 select s.status,s.starts_at,s.ends_at,p.code
 into v_state,v_start,v_end,v_plan
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.business_id=p_business
 order by s.starts_at desc,s.created_at desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object('state','not_configured','plan',null,
   'billing_live',false,'entitlements_enabled',false,'trial_days',14,'grace_days',7);
 end if;
 if v_state='trial' then
  v_trial_end:=pg_catalog.least(coalesce(v_end,v_start+interval '14 days'),v_start+interval '14 days');
  v_state:=case when now()<v_start then 'scheduled' when now()<v_trial_end then 'trial' else 'expired' end;
  v_end:=v_trial_end;
 elsif v_state='cancelled' then
  v_state:='cancelled';
 elsif now()<v_start then
  v_state:='scheduled';
 elsif v_state='expired' then
  v_state:='expired';
 elsif v_end is not null and now()>=v_end+interval '7 days' then
  v_state:='expired';
 elsif v_state='past_due' or (v_end is not null and now()>=v_end) then
  v_state:='grace';
 end if;
 return pg_catalog.jsonb_build_object(
  'state',v_state,'plan',v_plan,'starts_at',v_start,'ends_at',v_end,
  'billing_live',false,'entitlements_enabled',false,
  'trial_days',14,'grace_days',7
 );
end;
$$;
revoke all on function public.beger_g29_merchant_subscription_preview(uuid) from public,anon,authenticated;
grant execute on function public.beger_g29_merchant_subscription_preview(uuid) to authenticated;
