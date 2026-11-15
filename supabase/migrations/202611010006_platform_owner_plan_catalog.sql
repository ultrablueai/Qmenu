-- Beger Phase 1: platform-owner plan catalog management, no invented pricing or billing.
-- Non-destructive and staging-only. Platform admins are entirely separate from merchant memberships.
create table public.platform_audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 action text not null,
 target_type text not null,
 target_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.platform_audit_events enable row level security;
revoke all on public.platform_audit_events from public,anon,authenticated;
create index platform_audit_actor_created_idx on public.platform_audit_events(actor_id,created_at desc);

create function public.platform_owner_create_plan(p_code text,p_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_id uuid; v_code text; v_name text;
begin
 if v_actor is null or not exists(select 1 from public.platform_admins a
   where a.user_id=v_actor and a.enabled=true and a.role='platform_owner') then
  raise exception 'platform owner required' using errcode='42501';
 end if;
 v_code:=lower(trim(coalesce(p_code,'')));
 v_name:=trim(coalesce(p_name,''));
 if v_code !~ '^[a-z][a-z0-9_]{2,31}$' or length(v_name) not between 2 and 90 then
  raise exception 'invalid plan input' using errcode='22023';
 end if;
 insert into public.plans(code,name,active) values(v_code,v_name,true) returning id into v_id;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'plan_created','plan',v_id,pg_catalog.jsonb_build_object('code',v_code,'name',v_name));
 return v_id;
end;
$$;

create function public.platform_owner_set_plan_active(p_plan uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_actor uuid := (select auth.uid()); v_previous boolean; v_code text;
begin
 if v_actor is null or not exists(select 1 from public.platform_admins a
   where a.user_id=v_actor and a.enabled=true and a.role='platform_owner') then
  raise exception 'platform owner required' using errcode='42501';
 end if;
 if p_active is null then raise exception 'invalid state' using errcode='22023'; end if;
 select active,code into v_previous,v_code from public.plans where id=p_plan for update;
 if not found then raise exception 'plan not found' using errcode='22023'; end if;
 if v_previous = p_active then return true; end if;
 update public.plans set active=p_active where id=p_plan;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(v_actor,'plan_status_changed','plan',p_plan,
 pg_catalog.jsonb_build_object('code',v_code,'from',v_previous,'to',p_active));
 return true;
end;
$$;

-- All plan mutations must go through verified owner-only RPCs.
revoke all on function public.platform_owner_create_plan(text,text) from public,anon,authenticated;
revoke all on function public.platform_owner_set_plan_active(uuid,boolean) from public,anon,authenticated;
grant execute on function public.platform_owner_create_plan(text,text) to authenticated;
grant execute on function public.platform_owner_set_plan_active(uuid,boolean) to authenticated;
