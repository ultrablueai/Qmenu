-- G33 fix: PostgreSQL LEAST is a special expression and must not be schema-qualified.
-- Replaces read-only G29 and G33 definitions only, no merchant data mutations.
-- Beger G33: tenant-checked entitlements in SHADOW MODE only.
-- No order/QR/KDS/cashier/print enforcement or billing is enabled here.
-- Every response is an eligibility *preview*, never a payment entitlement.
create or replace function public.beger_g33_merchant_entitlements_preview(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_actor uuid := (select auth.uid());
 v_status text;
 v_plan text;
 v_start timestamptz;
 v_end timestamptz;
 v_trial_end timestamptz;
 v_effective text := 'not_configured';
 v_trial_eligible boolean := false;
 v_branch_count integer := 0;
 v_branch_limit integer := 0;
 v_features jsonb;
begin
 if v_actor is null or p_business is null or not exists (
  select 1 from public.memberships m
  where m.user_id=v_actor and m.business_id=p_business and m.role in ('owner','manager')
 ) then raise exception 'Merchant entitlements preview forbidden' using errcode='42501';
 end if;
 if not exists(select 1 from public.businesses b where b.id=p_business and b.country_code='TR') then
  raise exception 'Turkey merchant required' using errcode='22023';
 end if;
 select s.status,p.code,s.starts_at,s.ends_at
 into v_status,v_plan,v_start,v_end
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.business_id=p_business
 order by s.starts_at desc,s.created_at desc,s.id desc limit 1;
 if found then
  if v_status='trial' then
   v_trial_end:=least(coalesce(v_end,v_start+interval '14 days'),v_start+interval '14 days');
   v_trial_eligible := now()>=v_start and now()<v_trial_end;
   v_effective:=case when now()<v_start then 'scheduled'
     when v_trial_eligible then 'trial'
     else 'expired' end;
  elsif v_status in ('cancelled','canceled') then
   v_effective:='cancelled';
  elsif now()<v_start then
   v_effective:='scheduled';
  elsif v_status='expired' then
   v_effective:='expired';
  elsif v_end is not null and now()>=v_end+interval '7 days' then
   v_effective:='expired';
  elsif v_status='past_due' or (v_end is not null and now()>=v_end) then
   v_effective:='grace';
  elsif v_status='active' then
   -- No verified payment settlement ledger exists. Active is NOT proof of paid entitlement.
   v_effective:='unverified_paid';
  else v_effective:='unverified';
  end if;
 end if;
 select count(*)::integer into v_branch_count from public.branches b where b.business_id=p_business;
 if v_plan in ('start','pro','business') and v_trial_eligible then
  v_branch_limit:=case when v_plan='business' then 2 else 1 end;
 end if;
 v_features:=pg_catalog.jsonb_build_object(
  'qr_menu',v_trial_eligible,
  'products_addons',v_trial_eligible,
  'table_orders',v_trial_eligible and v_plan in ('pro','business'),
  'takeaway_orders',v_trial_eligible and v_plan in ('pro','business'),
  'kitchen',v_trial_eligible and v_plan in ('pro','business'),
  'cashier',v_trial_eligible and v_plan in ('pro','business'),
  'printing',v_trial_eligible and v_plan in ('pro','business'),
  'pager',v_trial_eligible and v_plan in ('pro','business'),
  'advanced_reporting',v_trial_eligible and v_plan='business'
 );
 return pg_catalog.jsonb_build_object(
  'mode','shadow_preview',
  'enforcement_enabled',false,
  'billing_enabled',false,
  'paid_entitlements_verified',false,
  'plan',v_plan,
  'state',v_effective,
  'trial_ends_at',case when v_status='trial' then v_trial_end else null end,
  'features',v_features,
  'included_branches',v_branch_limit,
  'existing_branches',v_branch_count,
  'over_branch_limit',v_branch_limit>0 and v_branch_count>v_branch_limit,
  'data_retained',true
 );
end;
$$;
revoke all on function public.beger_g33_merchant_entitlements_preview(uuid) from public,anon,authenticated;
grant execute on function public.beger_g33_merchant_entitlements_preview(uuid) to authenticated;

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
  v_trial_end:=least(coalesce(v_end,v_start+interval '14 days'),v_start+interval '14 days');
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
