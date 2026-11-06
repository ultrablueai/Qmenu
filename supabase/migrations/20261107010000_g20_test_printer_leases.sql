-- Beger G20: manual dry-run printer reservation lab (NO physical print dispatch).
-- No device credentials, service_role keys, or anonymous access.
-- All reservations are tenant-scoped, expiring and do not change G17/G18 job state.
create table public.g20_print_test_devices(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 kind text not null check(kind in ('kitchen','pickup','summary')),
 label text not null check(char_length(label) between 1 and 80),
 active boolean not null default true,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(branch_id,kind,label)
);
create index g20_print_test_devices_business_idx on public.g20_print_test_devices(business_id);
create index g20_print_test_devices_creator_idx on public.g20_print_test_devices(created_by);
alter table public.g20_print_test_devices enable row level security;
revoke all on public.g20_print_test_devices from public,anon,authenticated;

create table public.g20_print_test_leases(
 job_id uuid primary key references public.g17_order_print_jobs(id) on delete cascade,
 device_id uuid not null references public.g20_print_test_devices(id) on delete cascade,
 lease_token uuid not null,
 acquired_by uuid not null references auth.users(id),
 acquired_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create index g20_print_test_leases_device_idx on public.g20_print_test_leases(device_id);
create index g20_print_test_leases_expires_idx on public.g20_print_test_leases(expires_at);
create index g20_print_test_leases_acquired_idx on public.g20_print_test_leases(acquired_by);
alter table public.g20_print_test_leases enable row level security;
revoke all on public.g20_print_test_leases from public,anon,authenticated;

create or replace function public.g20_register_test_printer(p_branch uuid,p_kind text,p_label text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_label text;v_id uuid;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Printer lab forbidden' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('kitchen','pickup','summary') then
  raise exception 'Invalid station kind' using errcode='22023';end if;
 v_label:=nullif(pg_catalog.btrim(coalesce(p_label,'')),'');
 if v_label is null or char_length(v_label)>80 or pg_catalog.strpos(v_label,chr(10))>0
   or pg_catalog.strpos(v_label,chr(13))>0 then
  raise exception 'Invalid test printer name' using errcode='22023';end if;
 insert into public.g20_print_test_devices(business_id,branch_id,kind,label,created_by)
 values(v_business,p_branch,p_kind,v_label,auth.uid())
 on conflict(branch_id,kind,label) do update set active=true
 returning id into v_id;
 return pg_catalog.jsonb_build_object('id',v_id,'kind',p_kind,'label',v_label,'simulation_only',true);
end $$;
revoke all on function public.g20_register_test_printer(uuid,text,text) from public,anon,authenticated;
grant execute on function public.g20_register_test_printer(uuid,text,text) to authenticated;

create or replace function public.g20_claim_test_print(p_device uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare d public.g20_print_test_devices%rowtype;v_job uuid;v_token uuid;v_expires timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into d from public.g20_print_test_devices where id=p_device and active;
 if not found or not exists(
  select 1 from public.memberships m where m.business_id=d.business_id and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Test printer claim forbidden' using errcode='42501';end if;
 -- Lock a queued job row. Other callers use SKIP LOCKED, preventing duplicate claims.
 select j.id into v_job from public.g17_order_print_jobs j
 left join public.g20_print_test_leases lease on lease.job_id=j.id
 where j.business_id=d.business_id and j.branch_id=d.branch_id
 and j.kind=d.kind and j.state='queued'
 and (lease.job_id is null or lease.expires_at<=now())
 order by j.created_at,j.id
 for update of j skip locked limit 1;
 if v_job is null then return pg_catalog.jsonb_build_object('claimed',false,'simulation_only',true);end if;
 v_token:=gen_random_uuid();v_expires:=now()+interval '90 seconds';
 insert into public.g20_print_test_leases(job_id,device_id,lease_token,acquired_by,expires_at)
 values(v_job,d.id,v_token,auth.uid(),v_expires)
 on conflict(job_id) do update
 set device_id=excluded.device_id,lease_token=excluded.lease_token,
     acquired_by=excluded.acquired_by,acquired_at=now(),expires_at=excluded.expires_at
 where public.g20_print_test_leases.expires_at<=now();
 if not found then return pg_catalog.jsonb_build_object('claimed',false,'simulation_only',true);end if;
 return pg_catalog.jsonb_build_object(
  'claimed',true,'jobId',v_job,'leaseToken',v_token,
  'expiresAt',v_expires,'kind',d.kind,'simulation_only',true
 );
end $$;
revoke all on function public.g20_claim_test_print(uuid) from public,anon,authenticated;
grant execute on function public.g20_claim_test_print(uuid) to authenticated;

create or replace function public.g20_release_test_print(p_device uuid,p_job uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare d public.g20_print_test_devices%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into d from public.g20_print_test_devices where id=p_device;
 if not found or not exists(
  select 1 from public.memberships m where m.business_id=d.business_id and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Test printer release forbidden' using errcode='42501';end if;
 delete from public.g20_print_test_leases l using public.g17_order_print_jobs j
 where l.job_id=p_job and l.job_id=j.id and l.device_id=d.id
 and j.business_id=d.business_id and j.branch_id=d.branch_id and j.kind=d.kind
 and l.lease_token=p_token and l.acquired_by=auth.uid();
 return found;
end $$;
revoke all on function public.g20_release_test_print(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.g20_release_test_print(uuid,uuid,uuid) to authenticated;

create or replace function public.g20_test_printer_status(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid()
  and m.role in ('owner','manager')
 ) then raise exception 'Printer lab status forbidden' using errcode='42501';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',d.id,'kind',d.kind,'label',d.label,
   'activeLeaseCount',(select count(*) from public.g20_print_test_leases l
    where l.device_id=d.id and l.expires_at>now()),
   'simulation_only',true
 ) order by d.kind,d.label),'[]'::jsonb)
 into v_result from public.g20_print_test_devices d
 where d.branch_id=p_branch and d.business_id=v_business and d.active;
 return v_result;
end $$;
revoke all on function public.g20_test_printer_status(uuid) from public,anon,authenticated;
grant execute on function public.g20_test_printer_status(uuid) to authenticated;
