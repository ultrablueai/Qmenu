-- Beger G18: auditable manual print retry/failure, staging only.
-- No automatic printer hardware commands. A confirmed job is human-attested only.
alter table public.g17_order_print_jobs
 drop constraint g17_order_print_jobs_state_check;
alter table public.g17_order_print_jobs
 add constraint g17_order_print_jobs_state_check
 check(state in ('queued','previewed','failed','confirmed'));
alter table public.g17_order_print_jobs
 add column failure_note text,
 add constraint g18_print_failure_note_length check(failure_note is null or char_length(failure_note)<=200);

create table public.g18_print_job_events(
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.g17_order_print_jobs(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 action text not null check(action in ('preview','confirm','fail','retry')),
 from_state text not null,
 to_state text not null,
 note text check(note is null or char_length(note)<=200),
 created_at timestamptz not null default now()
);
create index g18_print_job_events_job_recent_idx on public.g18_print_job_events(job_id,created_at desc);
create index g18_print_job_events_branch_recent_idx on public.g18_print_job_events(branch_id,created_at desc);
alter table public.g18_print_job_events enable row level security;
revoke all on public.g18_print_job_events from public,anon,authenticated;

create or replace function public.g18_print_job_action(
 p_job uuid,p_action text,p_note text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_job public.g17_order_print_jobs%rowtype;v_next text;v_note text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into v_job from public.g17_order_print_jobs where id=p_job for update;
 if not found or not exists(
  select 1 from public.memberships m
  where m.business_id=v_job.business_id and m.user_id=auth.uid()
   and m.role in ('owner','manager')
 ) then raise exception 'Print job action forbidden' using errcode='42501';end if;

 v_note:=nullif(pg_catalog.btrim(coalesce(p_note,'')),'');
 if v_note is not null and char_length(v_note)>200 then
  raise exception 'Print note too long' using errcode='22023';end if;
 if p_action='preview' and v_job.state in ('queued','previewed') then
  v_next:='previewed';
 elsif p_action='fail' and v_job.state in ('queued','previewed') and v_note is not null then
  v_next:='failed';
 elsif p_action='retry' and v_job.state in ('failed','previewed') then
  v_next:='queued';
 elsif p_action='retry' and v_job.state='confirmed' and v_note is not null then
  v_next:='queued';
 elsif p_action='confirm' and v_job.state='previewed' then
  v_next:='confirmed';
 else raise exception 'Invalid print action or missing reason' using errcode='22023';end if;

 update public.g17_order_print_jobs
 set state=v_next,
     attempts=attempts+case when p_action='preview' then 1 else 0 end,
     failure_note=case when p_action='fail' then v_note
                       when p_action in ('preview','confirm','retry') then null
                       else failure_note end,
     last_actor=auth.uid(),updated_at=now()
 where id=v_job.id;
 insert into public.g18_print_job_events(
  job_id,business_id,branch_id,actor_id,action,from_state,to_state,note
 ) values(v_job.id,v_job.business_id,v_job.branch_id,auth.uid(),p_action,v_job.state,v_next,v_note);
 return pg_catalog.jsonb_build_object('id',v_job.id,'state',v_next);
end $$;
revoke all on function public.g18_print_job_action(uuid,text,text) from public,anon,authenticated;
grant execute on function public.g18_print_job_action(uuid,text,text) to authenticated;

-- Existing G17 callers use the same guarded/audited logic; no bypass to unlogged mutations.
create or replace function public.g17_print_job_action(p_job uuid,p_action text)
returns jsonb language sql security definer set search_path=''
as $$
 select public.g18_print_job_action(p_job,p_action,null)
$$;
revoke all on function public.g17_print_job_action(uuid,text) from public,anon,authenticated;
grant execute on function public.g17_print_job_action(uuid,text) to authenticated;

-- Role-checked queue with current issue note; never expose raw jobs or audit tables.
create or replace function public.g17_branch_print_jobs(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Print queue forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',j.id,'kind',j.kind,'state',j.state,'attempts',j.attempts,'createdAt',j.created_at,
  'failureNote',j.failure_note,
  'order',pg_catalog.jsonb_build_object(
    'id',o.id,'table',o.table_label,'serviceMode',o.service_mode,'status',o.status,
    'paymentStatus',o.payment_status,'paymentMethod',o.payment_method,
    'totalMinor',o.total_minor,'currency',o.currency,'createdAt',o.created_at,
    'items',coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
       'name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections
      ) order by i.id)
      from public.g3_order_items i where i.order_id=o.id
    ),'[]'::jsonb)
  )
 ) order by case j.state when 'failed' then 0 when 'queued' then 1 when 'previewed' then 2 else 3 end,
 j.created_at desc,j.id),'[]'::jsonb)
 into v_result
 from (
  select * from public.g17_order_print_jobs where branch_id=p_branch
  order by case state when 'failed' then 0 when 'queued' then 1 when 'previewed' then 2 else 3 end,
  created_at desc,id limit 120
 ) j join public.g3_orders o on o.id=j.order_id
 and o.business_id=j.business_id and o.branch_id=j.branch_id;
 return v_result;
end $$;
revoke all on function public.g17_branch_print_jobs(uuid) from public,anon,authenticated;
grant execute on function public.g17_branch_print_jobs(uuid) to authenticated;

create or replace function public.g18_branch_print_events(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Print event history forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',e.id,'jobId',e.job_id,'action',e.action,'fromState',e.from_state,
  'toState',e.to_state,'note',e.note,'createdAt',e.created_at
 ) order by e.created_at desc,e.id),'[]'::jsonb)
 into v_result from (
  select id,job_id,action,from_state,to_state,note,created_at
  from public.g18_print_job_events where branch_id=p_branch
  order by created_at desc,id limit 60
 ) e;
 return v_result;
end $$;
revoke all on function public.g18_branch_print_events(uuid) from public,anon,authenticated;
grant execute on function public.g18_branch_print_events(uuid) to authenticated;
