-- Beger G23: durable branch-scoped order notification feed (no Push/subscription yet).
-- Events are inserted atomically on order insert / status change, no fake historical backfill.
create table public.g23_order_notifications(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.g3_orders(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 status text not null check(status in ('pending','accepted','ready','rejected')),
 station text not null check(station in ('merchant','cashier','kitchen')),
 created_at timestamptz not null default now(),
 unique(order_id,status,station)
);
create index g23_order_notifications_station_recent_idx
 on public.g23_order_notifications(branch_id,station,created_at desc);
create index g23_order_notifications_business_idx
 on public.g23_order_notifications(business_id);
alter table public.g23_order_notifications enable row level security;
revoke all on public.g23_order_notifications from public,anon,authenticated;

create table public.g23_notification_reads(
 notification_id uuid not null references public.g23_order_notifications(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default now(),
 primary key(notification_id,user_id)
);
create index g23_notification_reads_user_recent_idx on public.g23_notification_reads(user_id,read_at desc);
alter table public.g23_notification_reads enable row level security;
revoke all on public.g23_notification_reads from public,anon,authenticated;

create or replace function public.g23_enqueue_order_notifications()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' or new.status is distinct from old.status then
  if new.status='pending' then
   insert into public.g23_order_notifications(order_id,business_id,branch_id,status,station)
   values(new.id,new.business_id,new.branch_id,'pending','merchant'),
         (new.id,new.business_id,new.branch_id,'pending','cashier')
   on conflict(order_id,status,station) do nothing;
  elsif new.status='accepted' then
   insert into public.g23_order_notifications(order_id,business_id,branch_id,status,station)
   values(new.id,new.business_id,new.branch_id,'accepted','kitchen')
   on conflict(order_id,status,station) do nothing;
  elsif new.status='ready' then
   insert into public.g23_order_notifications(order_id,business_id,branch_id,status,station)
   values(new.id,new.business_id,new.branch_id,'ready','cashier')
   on conflict(order_id,status,station) do nothing;
  elsif new.status='rejected' then
   insert into public.g23_order_notifications(order_id,business_id,branch_id,status,station)
   values(new.id,new.business_id,new.branch_id,'rejected','merchant')
   on conflict(order_id,status,station) do nothing;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.g23_enqueue_order_notifications() from public,anon,authenticated;
drop trigger if exists g23_order_status_notification on public.g3_orders;
create trigger g23_order_status_notification
after insert or update of status on public.g3_orders
for each row execute function public.g23_enqueue_order_notifications();

-- A role membership + explicit station assignment is required for staff.
-- Owners/managers may manage all stations for their own business.
create or replace function public.g23_notification_station_allowed(p_branch uuid,p_station text)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null
 and p_station in ('merchant','cashier','kitchen')
 and exists(
  select 1 from public.branches b
  join public.memberships m on m.business_id=b.business_id and m.user_id=auth.uid()
  where b.id=p_branch and (
   m.role in ('owner','manager')
   or (m.role='staff' and p_station='cashier' and exists(
    select 1 from public.g10_cashier_staff_branches cs
    where cs.branch_id=b.id and cs.business_id=b.business_id and cs.user_id=auth.uid()
   ))
   or (m.role='staff' and p_station='kitchen' and exists(
    select 1 from public.g9_kitchen_staff_branches ks
    where ks.branch_id=b.id and ks.business_id=b.business_id and ks.user_id=auth.uid()
   ))
  )
 )
$$;
revoke all on function public.g23_notification_station_allowed(uuid,text) from public,anon,authenticated;

create or replace function public.g23_branch_notifications(p_branch uuid,p_station text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if not public.g23_notification_station_allowed(p_branch,p_station) then
  raise exception 'Notifications forbidden' using errcode='42501';
 end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',n.id,'status',n.status,'station',n.station,'orderId',n.order_id,
   'reference',upper(substr(replace(n.order_id::text,'-',''),1,10)),
   'table',o.table_label,'createdAt',n.created_at,
   'read',r.notification_id is not null
 ) order by n.created_at desc,n.id desc),'[]'::jsonb)
 into v_result
 from (
  select * from public.g23_order_notifications
  where branch_id=p_branch and station=p_station and created_at>=now()-interval '7 days'
  order by created_at desc,id desc limit 60
 ) n
 join public.g3_orders o on o.id=n.order_id
 and o.business_id=n.business_id and o.branch_id=n.branch_id
 left join public.g23_notification_reads r on r.notification_id=n.id and r.user_id=auth.uid();
 return v_result;
end $$;
revoke all on function public.g23_branch_notifications(uuid,text) from public,anon,authenticated;
grant execute on function public.g23_branch_notifications(uuid,text) to authenticated;

create or replace function public.g23_mark_notification_read(p_notification uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_branch uuid;v_station text;
begin
 select n.branch_id,n.station into v_branch,v_station
 from public.g23_order_notifications n where n.id=p_notification;
 if v_branch is null or not public.g23_notification_station_allowed(v_branch,v_station) then
  raise exception 'Notification read forbidden' using errcode='42501';
 end if;
 insert into public.g23_notification_reads(notification_id,user_id)
 values(p_notification,auth.uid())
 on conflict(notification_id,user_id) do nothing;
 return true;
end $$;
revoke all on function public.g23_mark_notification_read(uuid) from public,anon,authenticated;
grant execute on function public.g23_mark_notification_read(uuid) to authenticated;
