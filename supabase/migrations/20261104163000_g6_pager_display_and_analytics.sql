-- Beger G6 public display: a share-only board token, never ticket or invoice tokens.
-- Does not change G3 orders or live queue transitions.
create table if not exists public.g6_pager_displays(
 branch_id uuid primary key references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 display_token uuid not null unique default gen_random_uuid(),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.g6_pager_displays enable row level security;
revoke all on public.g6_pager_displays from public,anon,authenticated;

-- Merchant can enable the display per branch and rotate a leaked display link.
create or replace function public.g6_pager_display_config(p_branch uuid,p_action text default 'read')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_display public.g6_pager_displays%rowtype;
begin
 if not public.g6_pager_branch_authorized(p_branch) then
  raise exception 'Not authorized for pager display' using errcode='42501';end if;
 if p_action not in ('read','enable','disable','rotate') then
  raise exception 'Invalid pager display action' using errcode='22023';end if;
 select business_id into v_business from public.branches where id=p_branch;
 if p_action='read' then
  select * into v_display from public.g6_pager_displays where branch_id=p_branch;
  if not found then return jsonb_build_object('enabled',false,'token',null);end if;
 else
  insert into public.g6_pager_displays(branch_id,business_id,enabled)
  values(p_branch,v_business,p_action='enable')
  on conflict(branch_id) do update set
   enabled=case when p_action='enable' then true when p_action='disable' then false else public.g6_pager_displays.enabled end,
   display_token=case when p_action='rotate' then gen_random_uuid() else public.g6_pager_displays.display_token end,
   updated_at=now()
  returning * into v_display;
 end if;
 return jsonb_build_object('enabled',v_display.enabled,'token',v_display.display_token);
end $$;
revoke all on function public.g6_pager_display_config(uuid,text) from public,anon,authenticated;
grant execute on function public.g6_pager_display_config(uuid,text) to authenticated;

-- Public board returns only visible number and state, no private identifiers
-- or customer links. Only ready numbers appear; 24h window prevents old tickets resurfacing.
create or replace function public.g6_pager_display_status(p_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'branchName',b.name,
  'ready',coalesce((
   select jsonb_agg(x.display_number order by x.ready_at desc)
   from (select t.display_number,t.ready_at
     from public.g6_pager_tickets t
     where t.branch_id=d.branch_id and t.status='ready'
      and t.created_at>=now()-interval '24 hours'
     order by t.ready_at desc limit 16) x
  ),'[]'::jsonb),
  'waitingCount',(select count(*) from public.g6_pager_tickets t
    where t.branch_id=d.branch_id and t.status='waiting'
     and t.created_at>=now()-interval '24 hours'),
  'preparingCount',(select count(*) from public.g6_pager_tickets t
    where t.branch_id=d.branch_id and t.status='preparing'
     and t.created_at>=now()-interval '24 hours')
 )
 from public.g6_pager_displays d
 join public.branches b on b.id=d.branch_id
 where d.enabled=true and d.display_token=p_token
$$;
revoke all on function public.g6_pager_display_status(uuid) from public,anon,authenticated;
grant execute on function public.g6_pager_display_status(uuid) to anon,authenticated;

-- Branch-only operational evidence: historical completed/ready tickets and actual durations.
-- Elapsed timings are samples of events, not promised future waiting estimates.
create or replace function public.g6_pager_branch_analytics(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if not public.g6_pager_branch_authorized(p_branch) then
  raise exception 'Not authorized for pager analytics' using errcode='42501';end if;
 select jsonb_build_object(
  'issued',count(*),
  'waiting',count(*) filter(where status='waiting'),
  'preparing',count(*) filter(where status='preparing'),
  'ready',count(*) filter(where status='ready'),
  'fulfilled',count(*) filter(where status='fulfilled'),
  'cancelled',count(*) filter(where status='cancelled'),
  'sampledReady',count(*) filter(where ready_at is not null),
  'averageReadyMinutes',round(avg(extract(epoch from (ready_at-created_at))/60)
     filter(where ready_at is not null)::numeric,1),
  'sampledFulfilled',count(*) filter(where ready_at is not null and fulfilled_at is not null),
  'averagePickupMinutes',round(avg(extract(epoch from (fulfilled_at-ready_at))/60)
     filter(where ready_at is not null and fulfilled_at is not null)::numeric,1)
 ) into v_result from public.g6_pager_tickets
 where branch_id=p_branch and created_at>=now()-interval '7 days';
 return v_result;
end $$;
revoke all on function public.g6_pager_branch_analytics(uuid) from public,anon,authenticated;
grant execute on function public.g6_pager_branch_analytics(uuid) to authenticated;
