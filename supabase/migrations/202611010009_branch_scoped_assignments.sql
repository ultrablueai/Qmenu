-- Phase 1: branch-scoped staff membership. STAGING ONLY.
-- Branch staff must not inherit read access to all branches via business membership.
create table public.branch_assignments (
 business_id uuid not null,
 branch_id uuid not null,
 user_id uuid not null,
 branch_role text not null check (branch_role in ('branch_manager','branch_staff')),
 assigned_at timestamptz not null default now(),
 primary key(branch_id,user_id),
 foreign key(business_id,branch_id) references public.branches(business_id,id) on delete cascade,
 foreign key(business_id,user_id) references public.memberships(business_id,user_id) on delete cascade
);
create index branch_assignments_user_business_idx on public.branch_assignments(user_id,business_id);
alter table public.branch_assignments enable row level security;
revoke all on public.branch_assignments from public,anon,authenticated;
grant select(business_id,branch_id,user_id,branch_role,assigned_at) on public.branch_assignments to authenticated;
create policy branch_assignments_self_or_manager_read on public.branch_assignments
for select to authenticated using (
 user_id=(select auth.uid()) or exists (
  select 1 from public.memberships m where m.business_id=branch_assignments.business_id
  and m.user_id=(select auth.uid()) and m.role in ('owner','manager')
 )
);

drop policy if exists branches_member_read on public.branches;
create policy branches_scoped_member_read on public.branches
for select to authenticated using (
 exists (select 1 from public.memberships m
  where m.business_id=branches.business_id and m.user_id=(select auth.uid())
  and m.role in ('owner','manager'))
 or exists (select 1 from public.branch_assignments ba
  where ba.business_id=branches.business_id and ba.branch_id=branches.id
    and ba.user_id=(select auth.uid()))
);

create function public.assign_branch_staff(p_branch uuid,p_user uuid,p_role text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid()); v_business uuid;
begin
 if v_actor is null then raise exception 'login required' using errcode='28000';end if;
 if p_role not in ('branch_manager','branch_staff') or p_role is null
 then raise exception 'invalid branch role' using errcode='22023';end if;
 select business_id into v_business from public.branches where id=p_branch;
 if v_business is null then raise exception 'branch not found' using errcode='22023';end if;
 if not exists(select 1 from public.memberships m
   where m.business_id=v_business and m.user_id=v_actor and m.role in ('owner','manager'))
 then raise exception 'branch manager required' using errcode='42501';end if;
 if not exists(select 1 from public.memberships m
   where m.business_id=v_business and m.user_id=p_user and m.role='staff')
 then raise exception 'target must be staff member of this business' using errcode='42501';end if;
 insert into public.branch_assignments(business_id,branch_id,user_id,branch_role)
 values(v_business,p_branch,p_user,p_role)
 on conflict(branch_id,user_id) do update set branch_role=excluded.branch_role;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(v_business,v_actor,'branch_staff_assigned',
  pg_catalog.jsonb_build_object('branch_id',p_branch,'staff_user_id',p_user,'branch_role',p_role));
 return true;
end;
$$;
revoke all on function public.assign_branch_staff(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.assign_branch_staff(uuid,uuid,text) to authenticated;
