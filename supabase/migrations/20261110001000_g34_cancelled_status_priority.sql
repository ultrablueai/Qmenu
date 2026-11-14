-- G34: cancellation must be distinguishable from natural expiration in merchant UI.
-- Security predicates, table grants and subscription rows are unchanged.
CREATE OR REPLACE FUNCTION public.g12_merchant_subscription_status(p_business uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_current record;v_found boolean:=false;
begin
 if auth.uid() is null or p_business is null or not exists (
  select 1 from public.memberships m
  where m.business_id=p_business and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then
  raise exception 'Subscription status forbidden' using errcode='42501';
 end if;
 select s.id,s.status,s.starts_at,s.ends_at,p.code as plan_code,p.name as plan_name
 into v_current from public.subscriptions s
 join public.plans p on p.id=s.plan_id
 where s.business_id=p_business
 order by s.starts_at desc,s.created_at desc limit 1;
 v_found:=found;
 if not v_found then
  return jsonb_build_object('state','not_configured','has_subscription',false);
 end if;
 return jsonb_build_object(
  'state',case
   when v_current.status='cancelled' then 'cancelled'
   when v_current.ends_at is not null and v_current.ends_at<=now() then 'expired'
   when v_current.starts_at>now() then 'scheduled'
   else v_current.status end,
  'has_subscription',true,
  'plan_code',v_current.plan_code,
  'plan_name',v_current.plan_name,
  'starts_at',v_current.starts_at,
  'ends_at',v_current.ends_at
 );
end $function$
;
