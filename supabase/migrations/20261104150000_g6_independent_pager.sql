-- Beger G6: independent pager, never creates a commercial order or payment record.
-- One atomic monotonically increasing visible number per branch; secret UUID tracking link.
create table if not exists public.g6_pager_counters(
 branch_id uuid primary key references public.branches(id) on delete cascade,
 last_number bigint not null default 0 check(last_number>=0)
);
create table if not exists public.g6_pager_tickets(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 display_number bigint not null check(display_number>0),
 secret_token uuid not null unique default gen_random_uuid(),
 external_reference text check(external_reference is null or length(external_reference)<=60),
 status text not null default 'waiting' check(status in ('waiting','preparing','ready','fulfilled','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 ready_at timestamptz,
 fulfilled_at timestamptz,
 unique(branch_id,display_number)
);
create index if not exists g6_pager_tickets_branch_recent_idx
 on public.g6_pager_tickets(branch_id,created_at desc);
alter table public.g6_pager_counters enable row level security;
alter table public.g6_pager_tickets enable row level security;
revoke all on public.g6_pager_counters,public.g6_pager_tickets from public,anon,authenticated;

create or replace function public.g6_pager_branch_authorized(p_branch uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists (
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid() and m.role in ('owner','manager')
 )
$$;
revoke all on function public.g6_pager_branch_authorized(uuid) from public,anon,authenticated;

create or replace function public.g6_pager_issue(p_branch uuid,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_no bigint;v_ticket public.g6_pager_tickets%rowtype;v_ref text;
begin
 if not public.g6_pager_branch_authorized(p_branch) then
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
 if not public.g6_pager_branch_authorized(p_branch) then
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
 if not found or not public.g6_pager_branch_authorized(v_row.branch_id) then
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

-- Only a bearer of the secret UUID can follow an individual ticket.
-- Never return branch credentials, staff IDs, invoice references or customer details.
create or replace function public.g6_pager_public_status(p_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object('number',t.display_number,'status',t.status,
  'createdAt',t.created_at,'readyAt',t.ready_at,'branchName',b.name)
 from public.g6_pager_tickets t join public.branches b on b.id=t.branch_id
 where t.secret_token=p_token and t.created_at>=now()-interval '7 days'
$$;
revoke all on function public.g6_pager_public_status(uuid) from public,anon,authenticated;
grant execute on function public.g6_pager_public_status(uuid) to anon,authenticated;
