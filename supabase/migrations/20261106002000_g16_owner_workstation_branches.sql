-- Beger Demo G16: owners/managers may open their business workstations.
-- Staff remain restricted to their explicitly assigned branch and station.
-- No global staff grants, no data changes, no Production changes.

create or replace function public.g10_my_cashier_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(pg_catalog.jsonb_agg(
 pg_catalog.jsonb_build_object('id',b.id,'name',b.name)
 order by b.name,b.id),'[]'::jsonb)
 from public.branches b
 where auth.uid() is not null and exists(
  select 1 from public.memberships m
  where m.business_id=b.business_id and m.user_id=auth.uid()
  and (
   m.role in ('owner','manager')
   or (m.role='staff' and exists(
    select 1 from public.g10_cashier_staff_branches c
    where c.branch_id=b.id and c.business_id=b.business_id
    and c.user_id=auth.uid()
   ))
  )
 )
$$;
revoke all on function public.g10_my_cashier_branches() from public,anon,authenticated;
grant execute on function public.g10_my_cashier_branches() to authenticated;

create or replace function public.g9_my_kitchen_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(pg_catalog.jsonb_agg(
 pg_catalog.jsonb_build_object('id',b.id,'name',b.name)
 order by b.name,b.id),'[]'::jsonb)
 from public.branches b
 where auth.uid() is not null and exists(
  select 1 from public.memberships m
  where m.business_id=b.business_id and m.user_id=auth.uid()
  and (
   m.role in ('owner','manager')
   or (m.role='staff' and exists(
    select 1 from public.g9_kitchen_staff_branches k
    where k.branch_id=b.id and k.business_id=b.business_id
    and k.user_id=auth.uid()
   ))
  )
 )
$$;
revoke all on function public.g9_my_kitchen_branches() from public,anon,authenticated;
grant execute on function public.g9_my_kitchen_branches() to authenticated;

create or replace function public.g7_staff_my_pager_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(pg_catalog.jsonb_agg(
 pg_catalog.jsonb_build_object('id',b.id,'name',b.name)
 order by b.name,b.id),'[]'::jsonb)
 from public.branches b
 where auth.uid() is not null and exists(
  select 1 from public.memberships m
  where m.business_id=b.business_id and m.user_id=auth.uid()
  and (
   m.role in ('owner','manager')
   or (m.role='staff' and exists(
    select 1 from public.g7_staff_branch_access a
    where a.branch_id=b.id and a.business_id=b.business_id
    and a.user_id=auth.uid()
   ))
  )
 )
$$;
revoke all on function public.g7_staff_my_pager_branches() from public,anon,authenticated;
grant execute on function public.g7_staff_my_pager_branches() to authenticated;
