-- Beger G7: branch-specific staff pager operations. No staff access to HQ, catalog,
-- billing, printer settings, display configuration or analytics.
create table if not exists public.g7_staff_branch_access(
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(branch_id,user_id)
);
create index if not exists g7_staff_business_idx on public.g7_staff_branch_access(business_id);
alter table public.g7_staff_branch_access enable row level security;
revoke all on public.g7_staff_branch_access from public,anon,authenticated;

-- A staff membership alone does NOT authorize any branch. Explicit assignment required.
create or replace function public.g7_pager_operator_allowed(p_branch uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists(
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid()
   and (m.role in ('owner','manager') or (m.role='staff' and exists(
    select 1 from public.g7_staff_branch_access a where a.branch_id=b.id
      and a.business_id=b.business_id and a.user_id=auth.uid()
   )))
 )
$$;
revoke all on function public.g7_pager_operator_allowed(uuid) from public,anon,authenticated;

-- The existing pager RPCs retain their signatures so owner/manager flows still work;
-- only these three operations gain branch-assigned staff access.
create or replace function public.g6_pager_issue(p_branch uuid,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_no bigint;v_ticket public.g6_pager_tickets%rowtype;v_ref text;
begin
 if not public.g7_pager_operator_allowed(p_branch) then
  raise exception 'Not authorized to issue tickets' using errcode='42501';end if;
 v_ref:=nullif(btrim(coalesce(p_reference,'')),'');
 if char_length(coalesce(v_ref,''))>60 then
  raise exception 'External receipt reference is too long' using errcode='22023';end if;
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 insert into public.g6_pager_counters(branch_id,last_number) values(p_branch,1)
 on conflict(branch_id) do update set last_number=public.g6_pager_counters.last_number+1
 returning last_number into v_no;
 insert into public.g6_pager_tickets(business_id,branch_id,display_number,external_reference)
 values(v_business,p_branch,v_no,v_ref) returning * into v_ticket;
 return jsonb_build_object('id',v_ticket.id,'number',v_ticket.display_number,
  'token',v_ticket.secret_token,'status',v_ticket.status,'createdAt',v_ticket.created_at);
end $$;
revoke all on function public.g6_pager_issue(uuid,text) from public,anon,authenticated;
grant execute on function public.g6_pager_issue(uuid,text) to authenticated;

create or replace function public.g6_pager_branch_tickets(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if not public.g7_pager_operator_allowed(p_branch) then
  raise exception 'Not authorized to view pager tickets' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'number',t.display_number,
  'token',t.secret_token,'reference',t.external_reference,'status',t.status,
  'createdAt',t.created_at,'readyAt',t.ready_at) order by t.created_at desc),'[]'::jsonb)
 into v_result from (
  select * from public.g6_pager_tickets
  where branch_id=p_branch and created_at>=now()-interval '24 hours'
  order by created_at desc limit 80
 ) t;
 return v_result;
end $$;
revoke all on function public.g6_pager_branch_tickets(uuid) from public,anon,authenticated;
grant execute on function public.g6_pager_branch_tickets(uuid) to authenticated;

create or replace function public.g6_pager_transition(p_ticket uuid,p_next text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_row public.g6_pager_tickets%rowtype;
begin
 select * into v_row from public.g6_pager_tickets where id=p_ticket for update;
 if not found or not public.g7_pager_operator_allowed(v_row.branch_id) then
  raise exception 'Not authorized for pager ticket' using errcode='42501';end if;
 if not (
   (v_row.status='waiting' and p_next in ('preparing','ready','cancelled'))
   or (v_row.status='preparing' and p_next in ('ready','cancelled'))
   or (v_row.status='ready' and p_next='fulfilled')
 ) then raise exception 'Invalid pager state transition' using errcode='22023';end if;
 update public.g6_pager_tickets set status=p_next,updated_at=now(),
  ready_at=case when p_next='ready' then now() else ready_at end,
  fulfilled_at=case when p_next='fulfilled' then now() else fulfilled_at end
 where id=p_ticket;
 return jsonb_build_object('id',p_ticket,'status',p_next);
end $$;
revoke all on function public.g6_pager_transition(uuid,text) from public,anon,authenticated;
grant execute on function public.g6_pager_transition(uuid,text) to authenticated;



-- Owner-only assignment. Email must already exist in Supabase Auth.
-- No invitation mail is sent and existing elevated roles are never modified.
create or replace function public.g7_staff_pager_assign(p_branch uuid,p_email text,p_allow boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_person uuid;v_role text;v_email text;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
   and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Not authorized to manage employees' using errcode='42501';end if;
 v_email:=lower(btrim(coalesce(p_email,'')));
 if p_allow is null or char_length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 then raise exception 'Invalid staff email' using errcode='22023';end if;
 select id into v_person from auth.users where lower(email)=v_email;
 if v_person is null then raise exception 'User must register before assignment' using errcode='22023';end if;
 select role into v_role from public.memberships where business_id=v_business and user_id=v_person for update;
 if v_role is not null and v_role<>'staff' then
  raise exception 'Only staff membership can be assigned' using errcode='42501';end if;
 if p_allow then
  insert into public.memberships(business_id,user_id,role)
  values(v_business,v_person,'staff') on conflict(business_id,user_id) do nothing;
  insert into public.g7_staff_branch_access(business_id,branch_id,user_id)
  values(v_business,p_branch,v_person) on conflict(branch_id,user_id) do nothing;
 else
  delete from public.g7_staff_branch_access
  where business_id=v_business and branch_id=p_branch and user_id=v_person;
 end if;
 return jsonb_build_object('assigned',p_allow);
end $$;
revoke all on function public.g7_staff_pager_assign(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.g7_staff_pager_assign(uuid,text,boolean) to authenticated;

create or replace function public.g7_staff_pager_roster(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_roster jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized to view staff' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'assignedAt',a.created_at)
  order by a.created_at desc),'[]'::jsonb) into v_roster
 from public.g7_staff_branch_access a join auth.users u on u.id=a.user_id
 join public.memberships m on m.user_id=a.user_id and m.business_id=a.business_id and m.role='staff'
 where a.business_id=v_business and a.branch_id=p_branch;
 return v_roster;
end $$;
revoke all on function public.g7_staff_pager_roster(uuid) from public,anon,authenticated;
grant execute on function public.g7_staff_pager_roster(uuid) to authenticated;

-- Only assigned staff get their own workstation branch list. Others see an empty list.
create or replace function public.g7_staff_my_pager_branches()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name)
 order by b.name),'[]'::jsonb)
 from public.g7_staff_branch_access a
 join public.branches b on b.id=a.branch_id and b.business_id=a.business_id
 join public.memberships m on m.business_id=b.business_id and m.user_id=a.user_id and m.role='staff'
 where a.user_id=auth.uid()
$$;
revoke all on function public.g7_staff_my_pager_branches() from public,anon,authenticated;
grant execute on function public.g7_staff_my_pager_branches() to authenticated;
