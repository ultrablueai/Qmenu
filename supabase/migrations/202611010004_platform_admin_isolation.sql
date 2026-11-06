-- Phase 1: isolated platform operator role. No implicit grant to merchant owners.
-- Only audited, manually approved provisioning may populate this table.
create table public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'platform_owner' check(role in ('platform_owner','platform_operator')),
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon,authenticated;
grant select(user_id,role,enabled,created_at) on public.platform_admins to authenticated;
create policy platform_admin_self_read on public.platform_admins for select to authenticated
using(user_id=(select auth.uid()) and enabled=true);

-- Aggregates only. No unrestricted access to individual merchant/customer records.
create function public.platform_admin_overview()
returns table(merchant_count bigint,branch_count bigint,account_memberships bigint)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists(
  select 1 from public.platform_admins a where a.user_id=v_actor and a.enabled=true
 ) then raise exception 'platform admin required' using errcode='42501'; end if;
 return query select
  (select count(*) from public.businesses),
  (select count(*) from public.branches),
  (select count(*) from public.memberships);
end;
$$;
revoke all on function public.platform_admin_overview() from public,anon,authenticated;
grant execute on function public.platform_admin_overview() to authenticated;
