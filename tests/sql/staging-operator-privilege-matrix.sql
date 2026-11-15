-- Beger Staging ONLY: platform operator privilege regression.
-- Runs as a SQL editor admin and always rolls back the temporary role mutation.
-- Simulates the same approved Staging account as operator; does NOT prove
-- login with a second independent user, which remains a separate release gate.
begin;
do $$
declare v_actor uuid;
begin
 select id into v_actor from auth.users where lower(email)='yastym5@gmail.com' and email_confirmed_at is not null;
 if v_actor is null then raise exception 'approved Staging owner not found'; end if;
 if not exists(select 1 from public.platform_admins where user_id=v_actor and role='platform_owner' and enabled=true)
 then raise exception 'account must currently be enabled platform owner'; end if;
 update public.platform_admins set role='platform_operator' where user_id=v_actor;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where lower(email)='yastym5@gmail.com'),true);
set local role authenticated;
do $$
declare denied integer:=0;
begin
 -- Operator may inspect bounded general platform data.
 perform * from public.platform_admin_business_directory();
 perform * from public.platform_admin_audit_overview();
 perform * from public.platform_admin_trial_overview();
 perform * from public.platform_admin_overview();

 -- Operator must NEVER access owner roster or mutate plans and trials.
 begin perform * from public.platform_owner_access_roster();
 exception when sqlstate '42501' then denied:=denied+1; end;
 begin perform public.platform_owner_create_plan('denyoperator','Denied operator');
 exception when sqlstate '42501' then denied:=denied+1; end;
 begin perform public.platform_owner_set_plan_active('00000000-0000-4000-8000-000000000001',false);
 exception when sqlstate '42501' then denied:=denied+1; end;
 begin perform public.platform_owner_start_trial('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',14);
 exception when sqlstate '42501' then denied:=denied+1; end;
 if denied<>4 then raise exception 'operator privilege escalation: only % of 4 denials',denied;end if;
end $$;
rollback;
