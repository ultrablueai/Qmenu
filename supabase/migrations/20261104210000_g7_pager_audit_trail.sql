-- Beger G7 audit: immutable operational evidence for independent pager tickets.
-- This migration only adds database-side logging and a tenant-authorized read RPC.
-- It does not rewrite existing G6/G7 issuing or state-transition logic.
create table if not exists public.g7_pager_audit_events (
 id bigint generated always as identity primary key,
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 ticket_id uuid not null references public.g6_pager_tickets(id),
 display_number bigint not null,
 actor_id uuid,
 action text not null check(action in ('issued','status_changed')),
 previous_status text,
 next_status text not null,
 happened_at timestamptz not null default now()
);
create index if not exists g7_pager_audit_branch_time_idx
 on public.g7_pager_audit_events(branch_id,happened_at desc);
create index if not exists g7_pager_audit_ticket_idx
 on public.g7_pager_audit_events(ticket_id,happened_at desc);
alter table public.g7_pager_audit_events enable row level security;
revoke all on public.g7_pager_audit_events from public,anon,authenticated;

-- A trigger is the authoritative capture point. It executes in the same transaction:
-- failed transitions and rolled-back ticket creation leave no misleading audit events.
create or replace function public.g7_capture_pager_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' then
  insert into public.g7_pager_audit_events
   (business_id,branch_id,ticket_id,display_number,actor_id,action,previous_status,next_status)
  values(new.business_id,new.branch_id,new.id,new.display_number,auth.uid(),'issued',null,new.status);
 elsif new.status is distinct from old.status then
  insert into public.g7_pager_audit_events
   (business_id,branch_id,ticket_id,display_number,actor_id,action,previous_status,next_status)
  values(new.business_id,new.branch_id,new.id,new.display_number,auth.uid(),
   'status_changed',old.status,new.status);
 end if;
 return new;
end $$;
revoke all on function public.g7_capture_pager_audit() from public,anon,authenticated;
drop trigger if exists g7_pager_audit_capture on public.g6_pager_tickets;
create trigger g7_pager_audit_capture
 after insert or update of status on public.g6_pager_tickets
 for each row execute function public.g7_capture_pager_audit();

-- Only owners/managers can view audit history. Staff who operate a pager
-- deliberately cannot read actors or the activity of other employees.
create or replace function public.g7_pager_audit_history(p_branch uuid,p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_results jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists (
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid()
    and m.role in ('owner','manager')
 ) then raise exception 'Not authorized to view pager audit history' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 then
  raise exception 'Invalid audit history limit' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',e.id,'number',e.display_number,'action',e.action,
  'from',e.previous_status,'to',e.next_status,
  'actor',case when e.actor_id is null then 'system' else coalesce(u.email,'account') end,
  'happenedAt',e.happened_at
 ) order by e.happened_at desc,e.id desc),'[]'::jsonb)
 into v_results from (
  select * from public.g7_pager_audit_events
  where branch_id=p_branch and business_id=v_business
  order by happened_at desc,id desc limit p_limit
 ) e left join auth.users u on u.id=e.actor_id;
 return v_results;
end $$;
revoke all on function public.g7_pager_audit_history(uuid,integer) from public,anon,authenticated;
grant execute on function public.g7_pager_audit_history(uuid,integer) to authenticated;
