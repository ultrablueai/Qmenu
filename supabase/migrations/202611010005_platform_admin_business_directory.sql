-- Phase 1: owner control center read-only merchant directory, carefully scoped.
-- No access to customer PII, tenant order records, passwords, or impersonation.
create function public.platform_admin_business_directory()
returns table(
 business_id uuid,business_name text,country_code text,branch_count bigint,member_count bigint,
 subscription_status text,created_at timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists (
  select 1 from public.platform_admins pa
  where pa.user_id=v_actor and pa.enabled=true
 ) then raise exception 'platform admin required' using errcode='42501'; end if;
 return query
 select b.id,b.name,b.country_code,
   (select count(*) from public.branches br where br.business_id=b.id),
   (select count(*) from public.memberships m where m.business_id=b.id),
   (select s.status from public.subscriptions s where s.business_id=b.id
     order by s.created_at desc,s.id desc limit 1),
   b.created_at
 from public.businesses b
 order by b.created_at desc,b.id
 limit 100;
end;
$$;
revoke all on function public.platform_admin_business_directory() from public,anon,authenticated;
grant execute on function public.platform_admin_business_directory() to authenticated;
