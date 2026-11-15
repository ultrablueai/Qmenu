-- Beger G13: merchant subscription service requests, no payments or plan activation.
-- All mutations are by owner / platform operator, with branch-independent business scope.
create table public.g13_subscription_requests(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 requested_by uuid not null references auth.users(id),
 kind text not null check(kind in ('trial','plan_review','renewal','cancellation')),
 status text not null default 'pending' check(status in ('pending','acknowledged','declined','withdrawn')),
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 updated_at timestamptz not null default now(),
 check((reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null))
);
create unique index g13_one_pending_per_business on public.g13_subscription_requests(business_id) where status='pending';
create index g13_requests_recent_idx on public.g13_subscription_requests(created_at desc);
alter table public.g13_subscription_requests enable row level security;
revoke all on public.g13_subscription_requests from public,anon,authenticated;

create or replace function public.g13_subscription_request(p_business uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_sub_exists boolean;v_id uuid;
begin
 if auth.uid() is null or not exists(
  select 1 from public.memberships m
  where m.business_id=p_business and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Owner subscription request required' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('trial','plan_review','renewal','cancellation')
 then raise exception 'Invalid request type' using errcode='22023';end if;
 -- Serialize competing requests for the same tenant across sessions.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('beger:subscription_request:'||p_business::text,0));
 select exists(select 1 from public.subscriptions s where s.business_id=p_business) into v_sub_exists;
 if p_kind='trial' and v_sub_exists then
  raise exception 'Trial request requires no existing subscription history' using errcode='22023';
 end if;
 if p_kind in ('renewal','cancellation') and not v_sub_exists then
  raise exception 'Subscription history required' using errcode='22023';
 end if;
 if exists(select 1 from public.g13_subscription_requests r where r.business_id=p_business and r.status='pending')
 then raise exception 'Pending subscription request already exists' using errcode='23505';end if;
 insert into public.g13_subscription_requests(business_id,requested_by,kind)
 values(p_business,auth.uid(),p_kind) returning id into v_id;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'merchant_subscription_request_created','subscription_request',v_id,
 pg_catalog.jsonb_build_object('business_id',p_business,'kind',p_kind));
 return pg_catalog.jsonb_build_object('id',v_id,'status','pending');
end $$;
revoke all on function public.g13_subscription_request(uuid,text) from public,anon,authenticated;
grant execute on function public.g13_subscription_request(uuid,text) to authenticated;

create or replace function public.g13_merchant_requests(p_business uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.memberships m where m.business_id=p_business and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Merchant subscription requests forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',r.id,'kind',r.kind,'status',r.status,'createdAt',r.created_at,'reviewedAt',r.reviewed_at
 ) order by r.created_at desc),'[]'::jsonb)
 into v_result from(
  select id,kind,status,created_at,reviewed_at
  from public.g13_subscription_requests
  where business_id=p_business order by created_at desc limit 25
 ) r;
 return v_result;
end $$;
revoke all on function public.g13_merchant_requests(uuid) from public,anon,authenticated;
grant execute on function public.g13_merchant_requests(uuid) to authenticated;

create or replace function public.g13_withdraw_request(p_request uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_business uuid;
begin
 select r.business_id into v_business from public.g13_subscription_requests r where r.id=p_request for update;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Owner request withdrawal required' using errcode='42501';end if;
 update public.g13_subscription_requests set status='withdrawn',updated_at=now()
 where id=p_request and status='pending';
 if not found then raise exception 'Only a pending request can be withdrawn' using errcode='22023';end if;
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'merchant_subscription_request_withdrawn','subscription_request',p_request,
 pg_catalog.jsonb_build_object('business_id',v_business));
 return true;
end $$;
revoke all on function public.g13_withdraw_request(uuid) from public,anon,authenticated;
grant execute on function public.g13_withdraw_request(uuid) to authenticated;

create or replace function public.g13_platform_request_queue()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled=true
  and p.role in ('platform_owner','platform_operator')
 ) then raise exception 'Platform subscription queue forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'id',r.id,'businessId',r.business_id,'businessName',r.business_name,
  'kind',r.kind,'status',r.status,'createdAt',r.created_at
 ) order by r.created_at desc),'[]'::jsonb) into v_result
 from (
  select sr.id,sr.business_id,b.name as business_name,sr.kind,sr.status,sr.created_at
  from public.g13_subscription_requests sr join public.businesses b on b.id=sr.business_id
  order by case when sr.status='pending' then 0 else 1 end, sr.created_at desc limit 100
 ) r;
 return v_result;
end $$;
revoke all on function public.g13_platform_request_queue() from public,anon,authenticated;
grant execute on function public.g13_platform_request_queue() to authenticated;

create or replace function public.g13_platform_resolve_request(p_request uuid,p_decision text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_kind text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.platform_admins p where p.user_id=auth.uid() and p.enabled=true
  and p.role='platform_owner'
 ) then raise exception 'Platform owner review required' using errcode='42501';end if;
 if p_decision is null or p_decision not in ('acknowledged','declined')
 then raise exception 'Invalid review decision' using errcode='22023';end if;
 select r.business_id,r.kind into v_business,v_kind
 from public.g13_subscription_requests r where r.id=p_request for update;
 if v_business is null then raise exception 'Request unavailable' using errcode='22023';end if;
 update public.g13_subscription_requests
 set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=p_request and status='pending';
 if not found then raise exception 'Request already processed' using errcode='22023';end if;
 -- An acknowledgment is administrative only. It NEVER modifies subscriptions or billing.
 insert into public.platform_audit_events(actor_id,action,target_type,target_id,details)
 values(auth.uid(),'merchant_subscription_request_reviewed','subscription_request',p_request,
 pg_catalog.jsonb_build_object('business_id',v_business,'kind',v_kind,'decision',p_decision));
 return true;
end $$;
revoke all on function public.g13_platform_resolve_request(uuid,text) from public,anon,authenticated;
grant execute on function public.g13_platform_resolve_request(uuid,text) to authenticated;
