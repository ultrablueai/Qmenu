-- Beger G28 read-only Admin capacity display. Staging simulation only.
create or replace function public.beger_g28_founder_dry_run_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_used integer;
begin
 if auth.uid() is null or not exists(
   select 1 from public.platform_admins a
   where a.user_id=auth.uid() and a.enabled=true
    and a.role in ('platform_owner','platform_operator')
 ) then
  raise exception 'Platform access required' using errcode='42501';
 end if;
 select count(*)::integer into v_used from public.beger_tr_founder_dry_run_slots;
 return pg_catalog.jsonb_build_object(
   'kind','simulation','max_slots',30,'used_slots',v_used,
   'remaining_slots',30-v_used,'billing_enabled',false,'promo_live',false
 );
end;
$$;
revoke all on function public.beger_g28_founder_dry_run_status() from public,anon,authenticated;
grant execute on function public.beger_g28_founder_dry_run_status() to authenticated;
