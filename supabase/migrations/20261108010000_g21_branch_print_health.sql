-- G21: read-only print operations health for authenticated owner/manager.
-- This is observability, not a printer heartbeat or automatic silent printing.
create or replace function public.g21_branch_print_health(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_counts jsonb;v_status text;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
   select 1 from public.memberships m
   where m.business_id=v_business and m.user_id=auth.uid()
   and m.role in ('owner','manager')
 ) then raise exception 'Print health forbidden' using errcode='42501';end if;

 select pg_catalog.jsonb_build_object(
   'total',count(*),
   'queued',count(*) filter(where j.state='queued'),
   'previewed',count(*) filter(where j.state='previewed'),
   'failed',count(*) filter(where j.state='failed'),
   'confirmed',count(*) filter(where j.state='confirmed'),
   'queued_over_5m',count(*) filter(where j.state='queued' and j.created_at<=now()-interval '5 minutes'),
   'previewed_over_10m',count(*) filter(where j.state='previewed' and j.updated_at<=now()-interval '10 minutes'),
   'oldest_pending_at',min(j.created_at) filter(where j.state<>'confirmed'),
   'failure_examples',coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
         'jobId',f.id,'kind',f.kind,'failureNote',f.failure_note,'updatedAt',f.updated_at
      ) order by f.updated_at desc,f.id) from (
         select id,kind,failure_note,updated_at
         from public.g17_order_print_jobs
         where branch_id=p_branch and business_id=v_business and state='failed'
         order by updated_at desc,id limit 5
      ) f
   ),'[]'::jsonb)
 ) into v_counts
 from public.g17_order_print_jobs j
 where j.branch_id=p_branch and j.business_id=v_business;

 select case
  when (v_counts->>'failed')::integer>0 then 'needs_attention'
  when (v_counts->>'queued_over_5m')::integer>0 or (v_counts->>'previewed_over_10m')::integer>0 then 'delayed'
  when (v_counts->>'total')::integer=0 then 'no_jobs'
  else 'normal'
 end into v_status;

 return v_counts || pg_catalog.jsonb_build_object(
   'status',v_status,
   'checked_at',now(),
   'manual_print_only',true,
   'hardware_connected',false,
   'simulated_devices',(
     select count(*) from public.g20_print_test_devices d
     where d.business_id=v_business and d.branch_id=p_branch and d.active
   ),
   'active_simulated_leases',(
     select count(*) from public.g20_print_test_leases l
     join public.g20_print_test_devices d on d.id=l.device_id
     where d.business_id=v_business and d.branch_id=p_branch and l.expires_at>now()
   ),
   'expired_simulated_leases',(
     select count(*) from public.g20_print_test_leases l
     join public.g20_print_test_devices d on d.id=l.device_id
     where d.business_id=v_business and d.branch_id=p_branch and l.expires_at<=now()
   )
 );
end $$;
revoke all on function public.g21_branch_print_health(uuid) from public,anon,authenticated;
grant execute on function public.g21_branch_print_health(uuid) to authenticated;
