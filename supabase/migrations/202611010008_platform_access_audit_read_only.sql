-- Phase 1: read-only owner access registry and bounded platform audit viewer.
-- Avoid exposing audit details JSON; event metadata only.
create function public.platform_owner_access_roster()
returns table(account_email text, role_name text, is_enabled boolean, granted_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins pa where pa.user_id=v_actor
     and pa.enabled=true and pa.role='platform_owner'
 ) then raise exception 'platform owner required' using errcode='42501'; end if;
 return query select u.email::text,pa.role,pa.enabled,pa.created_at
 from public.platform_admins pa join auth.users u on u.id=pa.user_id
 order by pa.created_at,pa.user_id limit 50;
end;
$$;
revoke all on function public.platform_owner_access_roster() from public,anon,authenticated;
grant execute on function public.platform_owner_access_roster() to authenticated;

create function public.platform_admin_audit_overview()
returns table(event_id bigint,event_action text,target_kind text,event_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists (
   select 1 from public.platform_admins pa where pa.user_id=v_actor and pa.enabled=true
 ) then raise exception 'platform admin required' using errcode='42501'; end if;
 return query select ev.id,ev.action,ev.target_type,ev.created_at
 from public.platform_audit_events ev order by ev.created_at desc,ev.id desc limit 50;
end;
$$;
revoke all on function public.platform_admin_audit_overview() from public,anon,authenticated;
grant execute on function public.platform_admin_audit_overview() to authenticated;
