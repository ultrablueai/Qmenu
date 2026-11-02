-- G2: One privacy-preserving customer QR credential per business; scans attributed to branches.
-- STAGING ONLY. This does not handle payments, login, automatic loyalty or sensitive clinic records.
create table public.business_customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  qr_hash text not null unique check (qr_hash ~ '^[0-9a-f]{64}$'),
  consent_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(business_id,id)
);
create index business_customers_business_idx on public.business_customers(business_id,created_at desc);

create table public.customer_qr_scans (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  branch_id uuid not null,
  customer_id uuid not null,
  scanned_by uuid not null references auth.users(id),
  scanned_at timestamptz not null default now(),
  foreign key(business_id,branch_id) references public.branches(business_id,id),
  foreign key(business_id,customer_id) references public.business_customers(business_id,id)
);
create index customer_qr_scans_customer_idx on public.customer_qr_scans(business_id,customer_id,scanned_at desc);
create index customer_qr_scans_branch_idx on public.customer_qr_scans(business_id,branch_id,scanned_at desc);

create table public.customer_qr_scan_attempts (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid not null,
  scanned_by uuid not null references auth.users(id),
  attempted_at timestamptz not null default now(),
  foreign key(business_id,branch_id) references public.branches(business_id,id)
);
create index qr_attempts_actor_idx on public.customer_qr_scan_attempts(scanned_by,attempted_at desc);

alter table public.business_customers enable row level security;
alter table public.customer_qr_scans enable row level security;
alter table public.customer_qr_scan_attempts enable row level security;
revoke all on public.business_customers, public.customer_qr_scans, public.customer_qr_scan_attempts from anon,authenticated;

-- Direct reads are owner/manager only; qr_hash is never exposed to API clients.
grant select(id,business_id,display_name,active,created_at,consent_at) on public.business_customers to authenticated;
grant select(id,business_id,branch_id,customer_id,scanned_by,scanned_at) on public.customer_qr_scans to authenticated;
create policy business_customers_owner_read on public.business_customers
 for select to authenticated using (
  exists(select 1 from public.memberships m where m.business_id=business_customers.business_id
    and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
 );
create policy business_qr_scans_manager_read on public.customer_qr_scans
 for select to authenticated using (
  exists(select 1 from public.memberships m where m.business_id=customer_qr_scans.business_id
    and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
 );
-- Attempts intentionally have no SELECT policy or client grants.

create function public.issue_business_customer_qr(p_business uuid,p_name text,p_consent boolean)
returns table(customer_id uuid, qr_code text)
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
        v_token text;
        v_customer uuid;
begin
 if v_actor is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if p_consent is distinct from true then raise exception 'customer consent required' using errcode='22023'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 100 then
   raise exception 'invalid customer display name' using errcode='22023';
 end if;
 if not exists(select 1 from public.memberships m where m.business_id=p_business and m.user_id=v_actor and m.role in ('owner','manager')) then
   raise exception 'unauthorized business' using errcode='42501';
 end if;
 v_token := 'QMB1.' || encode(extensions.gen_random_bytes(32),'hex');
 insert into public.business_customers(business_id,display_name,qr_hash,consent_at)
 values(p_business,trim(p_name),encode(extensions.digest(v_token,'sha256'),'hex'),now())
 returning id into v_customer;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(p_business,v_actor,'customer_qr_issued',jsonb_build_object('customer_id',v_customer));
 return query select v_customer,v_token;
end;
$$;

create function public.rotate_business_customer_qr(p_business uuid,p_customer uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
        v_token text;
begin
 if v_actor is null or not exists(select 1 from public.memberships m where m.business_id=p_business
    and m.user_id=v_actor and m.role in ('owner','manager')) then
   raise exception 'unauthorized business' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_customer::text,0));
 v_token := 'QMB1.' || encode(extensions.gen_random_bytes(32),'hex');
 update public.business_customers
 set qr_hash=encode(extensions.digest(v_token,'sha256'),'hex')
 where id=p_customer and business_id=p_business and active=true;
 if not found then raise exception 'customer unavailable' using errcode='22023'; end if;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(p_business,v_actor,'customer_qr_rotated',jsonb_build_object('customer_id',p_customer));
 return v_token;
end;
$$;

create function public.deactivate_business_customer_qr(p_business uuid,p_customer uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
begin
 if v_actor is null or not exists(select 1 from public.memberships m where m.business_id=p_business
    and m.user_id=v_actor and m.role in ('owner','manager')) then
   raise exception 'unauthorized business' using errcode='42501';
 end if;
 update public.business_customers set active=false
 where business_id=p_business and id=p_customer and active=true;
 if not found then return false; end if;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(p_business,v_actor,'customer_qr_deactivated',jsonb_build_object('customer_id',p_customer));
 return true;
end;
$$;

-- A scan is a business-local attendance record, NOT a login, purchase or loyalty award.
-- Every scan is attributed to the exact verified branch, not inferred from QR payload.
create function public.scan_business_customer_qr(p_branch uuid,p_code text)
returns table(result text,customer_id uuid,customer_name text)
language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := (select auth.uid());
        v_business uuid;
        v_customer uuid;
        v_name text;
        v_recent timestamptz;
begin
 if v_actor is null then raise exception 'unauthorized' using errcode='28000'; end if;
 select b.business_id into v_business
 from public.branches b join public.memberships m on m.business_id=b.business_id
 where b.id=p_branch and m.user_id=v_actor and m.role in ('owner','manager');
 if v_business is null then raise exception 'unauthorized branch' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 if (select count(*) from public.customer_qr_scan_attempts a
     where a.scanned_by=v_actor and a.attempted_at>now()-interval '1 minute') >= 15 then
   return query select 'rate_limited'::text,null::uuid,null::text;
   return;
 end if;
 insert into public.customer_qr_scan_attempts(business_id,branch_id,scanned_by) values(v_business,p_branch,v_actor);
 if p_code is null or p_code !~ '^QMB1\.[0-9a-f]{64}$' then
   return query select 'invalid'::text,null::uuid,null::text;
   return;
 end if;
 select c.id,c.display_name into v_customer,v_name from public.business_customers c
 where c.business_id=v_business and c.qr_hash=encode(extensions.digest(p_code,'sha256'),'hex')
   and c.active=true and c.consent_at is not null;
 if v_customer is null then
   return query select 'invalid'::text,null::uuid,null::text;
   return;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_customer::text,1));
 select max(s.scanned_at) into v_recent from public.customer_qr_scans s
 where s.business_id=v_business and s.customer_id=v_customer and s.branch_id=p_branch;
 if v_recent is not null and v_recent>now()-interval '30 seconds' then
   return query select 'duplicate'::text,v_customer,v_name;
   return;
 end if;
 insert into public.customer_qr_scans(business_id,branch_id,customer_id,scanned_by)
 values(v_business,p_branch,v_customer,v_actor);
 return query select 'recorded'::text,v_customer,v_name;
end;
$$;

revoke all on function public.issue_business_customer_qr(uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.rotate_business_customer_qr(uuid,uuid) from public,anon,authenticated;
revoke all on function public.deactivate_business_customer_qr(uuid,uuid) from public,anon,authenticated;
revoke all on function public.scan_business_customer_qr(uuid,text) from public,anon,authenticated;
grant execute on function public.issue_business_customer_qr(uuid,text,boolean) to authenticated;
grant execute on function public.rotate_business_customer_qr(uuid,uuid) to authenticated;
grant execute on function public.deactivate_business_customer_qr(uuid,uuid) to authenticated;
grant execute on function public.scan_business_customer_qr(uuid,text) to authenticated;
