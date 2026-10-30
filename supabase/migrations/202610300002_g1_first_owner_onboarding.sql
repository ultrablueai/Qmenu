-- G1 atomic first-business onboarding; staging review required.
-- Explicitly privileged function: validates caller via auth.uid() and strictly
-- limits owner bootstrap to one business per identity.
create or replace function public.create_first_business(
  p_business_name text,
  p_branch_name text,
  p_country_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_business uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;
  if length(trim(coalesce(p_business_name,''))) not between 2 and 160
     or length(trim(coalesce(p_branch_name,''))) not between 1 and 160
     or p_country_code not in ('TR','SY') then
    raise exception 'INVALID_INPUT' using errcode='22023';
  end if;

  -- Prevent concurrent requests by the same user from creating multiple tenants.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,0));

  if exists (select 1 from public.memberships where user_id=v_user) then
    raise exception 'BUSINESS_ALREADY_EXISTS' using errcode='23505';
  end if;

  insert into public.businesses(name,country_code)
    values (trim(p_business_name),p_country_code) returning id into v_business;
  insert into public.memberships(business_id,user_id,role)
    values (v_business,v_user,'owner');
  insert into public.branches(business_id,name)
    values (v_business,trim(p_branch_name));
  insert into public.audit_logs(business_id,actor_id,event_type,payload)
    values (v_business,v_user,'business.created','{}'::jsonb);
  return v_business;
end;
$$;

revoke all on function public.create_first_business(text,text,text) from public,anon;
grant execute on function public.create_first_business(text,text,text) to authenticated;
