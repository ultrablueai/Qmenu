-- Beger G17: transactional, idempotent print job outbox for all accepted orders.
-- Does not directly contact hardware. No invoice/tax documentation is generated.
create table public.g17_order_print_jobs(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.g3_orders(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 kind text not null check (kind in ('kitchen','pickup','summary')),
 state text not null default 'queued' check (state in ('queued','previewed','confirmed')),
 attempts integer not null default 0 check(attempts>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_actor uuid references auth.users(id),
 unique(order_id,kind)
);
create index g17_order_print_jobs_branch_state_idx on public.g17_order_print_jobs(branch_id,state,created_at desc);
alter table public.g17_order_print_jobs enable row level security;
revoke all on public.g17_order_print_jobs from public,anon,authenticated;

-- Immutable acceptance outbox event: accepted is the first moment a kitchen job may exist.
create or replace function public.g17_enqueue_accepted_print_jobs()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.status='accepted' and (tg_op='INSERT' or old.status is distinct from 'accepted') then
   insert into public.g17_order_print_jobs(order_id,business_id,branch_id,kind)
   values (new.id,new.business_id,new.branch_id,'kitchen'),
          (new.id,new.business_id,new.branch_id,'pickup'),
          (new.id,new.business_id,new.branch_id,'summary')
   on conflict(order_id,kind) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.g17_enqueue_accepted_print_jobs() from public,anon,authenticated;
drop trigger if exists g17_order_accepted_enqueue on public.g3_orders;
create trigger g17_order_accepted_enqueue after insert or update of status on public.g3_orders
for each row execute function public.g17_enqueue_accepted_print_jobs();

-- Owner/manager can see the full branch print queue. It is NOT available to guests or unassigned staff.
create or replace function public.g17_branch_print_jobs(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists (
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Print queue forbidden' using errcode='42501';end if;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',j.id,'kind',j.kind,'state',j.state,'attempts',j.attempts,'createdAt',j.created_at,
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
 ) order by case when j.state='queued' then 0 when j.state='previewed' then 1 else 2 end,
            j.created_at desc,j.id),'[]'::jsonb)
 into v_result
 from (
  select * from public.g17_order_print_jobs
  where branch_id=p_branch order by created_at desc,id limit 120
 ) j join public.g3_orders o on o.id=j.order_id and o.business_id=j.business_id and o.branch_id=j.branch_id;
 return v_result;
end $$;
revoke all on function public.g17_branch_print_jobs(uuid) from public,anon,authenticated;
grant execute on function public.g17_branch_print_jobs(uuid) to authenticated;

-- Preview means a print dialog was opened, NOT that paper left a physical printer.
-- Only explicit owner/manager confirmation can advance to confirmed.
create or replace function public.g17_print_job_action(p_job uuid,p_action text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_job public.g17_order_print_jobs%rowtype;v_state text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into v_job from public.g17_order_print_jobs where id=p_job for update;
 if not found or not exists(
  select 1 from public.memberships m
  where m.business_id=v_job.business_id and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Print job action forbidden' using errcode='42501';end if;
 if p_action='preview' and v_job.state in ('queued','previewed') then
   v_state:='previewed';
   update public.g17_order_print_jobs set state=v_state,attempts=attempts+1,last_actor=auth.uid(),updated_at=now() where id=p_job;
 elsif p_action='confirm' and v_job.state='previewed' then
   v_state:='confirmed';
   update public.g17_order_print_jobs set state=v_state,last_actor=auth.uid(),updated_at=now() where id=p_job;
 elsif p_action='retry' and v_job.state in ('previewed','confirmed') then
   v_state:='queued';
   update public.g17_order_print_jobs set state=v_state,last_actor=auth.uid(),updated_at=now() where id=p_job;
 else
   raise exception 'Invalid print job transition' using errcode='22023';
 end if;
 return pg_catalog.jsonb_build_object('id',p_job,'state',v_state);
end $$;
revoke all on function public.g17_print_job_action(uuid,text) from public,anon,authenticated;
grant execute on function public.g17_print_job_action(uuid,text) to authenticated;
