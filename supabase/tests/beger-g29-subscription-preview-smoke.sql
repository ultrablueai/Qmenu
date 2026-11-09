-- G29 owner-own and unrelated tenant negative authorization smoke. Read-only STAGING.
-- Uses real membership mappings with simulated claims; not independent JWT/browser E2E.
begin read only;
with sample as (
 select m.user_id,m.business_id,b.id foreign_business
 from public.memberships m cross join public.businesses b
 where m.role='owner' and b.id<>m.business_id
 and not exists (select 1 from public.memberships z where z.user_id=m.user_id and z.business_id=b.id)
 and not exists (select 1 from public.platform_admins a where a.user_id=m.user_id and a.enabled)
 order by m.created_at limit 1
)
select set_config('request.jwt.claim.sub',user_id::text,true),
 set_config('test.own',business_id::text,true),
 set_config('test.foreign',foreign_business::text,true)
from sample;
set local role authenticated;
do $checks$
declare own uuid; other uuid; result jsonb;
begin
 own:=current_setting('test.own')::uuid;
 other:=current_setting('test.foreign')::uuid;
 result:=public.beger_g29_merchant_subscription_preview(own);
 if result->>'state'<>'not_configured' or result->>'entitlements_enabled'<>'false'
    or result->>'billing_live'<>'false' then
  raise exception 'G29 own read-only baseline unexpected';
 end if;
 begin
  perform public.beger_g29_merchant_subscription_preview(other);
  raise exception 'SECURITY_TEST_FAILURE: foreign merchant data returned';
 exception when sqlstate '42501' then null;
 end;
end $checks$;
select 'G29: own subscription preview safe; foreign tenant denied' as smoke_result;
rollback;
