-- Beger G36: read-only renewal preflight for Turkish merchants.
-- PROPOSAL ONLY. No published offer, invoice, settled payment, automatic renewal,
-- active entitlement or subscription writes are created by this RPC.
create or replace function public.beger_g36_renewal_preflight(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_plan_code text;
  v_status text;
  v_start timestamptz;
  v_end timestamptz;
  v_effective text := 'not_configured';
  v_offer record;
  v_pending boolean;
  v_trial_end timestamptz;
begin
 if v_actor is null or p_business is null or not exists (
  select 1 from public.memberships m
  where m.business_id=p_business and m.user_id=v_actor and m.role in ('owner','manager')
 ) then raise exception 'Renewal preflight forbidden' using errcode='42501';end if;
 if not exists (select 1 from public.businesses b where b.id=p_business and b.country_code='TR') then
  raise exception 'Turkey business required' using errcode='22023';end if;
 select s.status,p.code,s.starts_at,s.ends_at
 into v_status,v_plan_code,v_start,v_end
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.business_id=p_business
 order by s.starts_at desc,s.created_at desc,s.id desc limit 1;
 if found then
   if v_status='trial' then
     v_trial_end:=least(coalesce(v_end,v_start+interval '14 days'),v_start+interval '14 days');
     v_end:=v_trial_end;
     v_effective:=case when now()<v_start then 'scheduled'
        when now()<v_trial_end then 'trial' else 'expired' end;
   elsif v_status='cancelled' then
     v_effective:='cancelled';
   elsif now()<v_start then v_effective:='scheduled';
   elsif v_status='expired' then v_effective:='expired';
   elsif v_end is not null and now()>=v_end+interval '7 days' then v_effective:='expired';
   elsif v_status='past_due' or (v_end is not null and now()>=v_end) then v_effective:='grace';
   elsif v_status='active' then v_effective:='unverified_paid';
   else v_effective:='unverified';end if;
 end if;
 select o.code,o.name,o.currency,o.monthly_gross_minor,o.annual_gross_minor,
    o.assumed_kdv_basis_points,o.published,o.billing_enabled
 into v_offer from public.beger_tr_offer_drafts o where o.code=v_plan_code;
 select exists(select 1 from public.g13_subscription_requests r
    where r.business_id=p_business and r.status='pending') into v_pending;
 return pg_catalog.jsonb_build_object(
    'mode','renewal_preflight_only','plan',v_plan_code,'state',v_effective,
    'ends_at',v_end,'grace_ends_at',
      case when v_status in ('active','past_due') and v_end is not null
        then v_end+interval '7 days' else null end,
    'proposal_monthly_gross_minor',
      case when v_offer.code is not null then v_offer.monthly_gross_minor else null end,
    'proposal_annual_gross_minor',
      case when v_offer.code is not null then v_offer.annual_gross_minor else null end,
    'currency','TRY','assumed_kdv_basis_points',
      case when v_offer.code is not null then v_offer.assumed_kdv_basis_points else null end,
    'pending_request',v_pending,
    'billing_enabled',false,'auto_renewal_enabled',false,
    'settlement_verified',false,'price_published',false,
    'entitlements_changed',false,'data_retained',true,
    'action',case when v_plan_code is null then 'select_plan'
      when v_pending then 'await_review' else 'request_renewal_review' end);
end;
$$;
revoke all on function public.beger_g36_renewal_preflight(uuid) from public,anon,authenticated;
grant execute on function public.beger_g36_renewal_preflight(uuid) to authenticated;
