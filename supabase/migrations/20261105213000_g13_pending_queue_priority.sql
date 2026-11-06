-- Preserve pending-first order in the final JSON aggregate for the platform queue.
-- The original G13 function pre-sorted the subquery, but its JSON aggregate
-- sorted only by created_at, burying older pending requests under newer closed ones.
-- No permissions, billing, subscription or row mutations.
create or replace function public.g13_platform_request_queue()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled=true
  and p.role in ('platform_owner','platform_operator')
 ) then raise exception 'Platform subscription queue forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',r.id,'businessId',r.business_id,'businessName',r.business_name,
  'kind',r.kind,'status',r.status,'createdAt',r.created_at
 ) order by case when r.status='pending' then 0 else 1 end,
            r.created_at desc, r.id),'[]'::jsonb) into v_result
 from (
  select sr.id,sr.business_id,b.name as business_name,sr.kind,sr.status,sr.created_at
  from public.g13_subscription_requests sr join public.businesses b on b.id=sr.business_id
  order by case when sr.status='pending' then 0 else 1 end, sr.created_at desc,sr.id
  limit 100
 ) r;
 return v_result;
end $$;
revoke all on function public.g13_platform_request_queue() from public,anon,authenticated;
grant execute on function public.g13_platform_request_queue() to authenticated;
