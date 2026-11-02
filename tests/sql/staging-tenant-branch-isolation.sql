-- Staging-only reproducible isolation acceptance test. Run in SQL editor as admin.
-- Uses a real existing confirmed owner auth account as test actor but only temporary
-- business/branch/assignment rows. All writes are rolled back, even on success.
-- Requires that the owner email below still corresponds to the approved Staging account.
begin;
create temporary table isolation_probe (
 staff_business uuid, other_business uuid,
 assigned_branch uuid, unassigned_branch uuid, other_branch uuid
) on commit drop;
grant select on isolation_probe to authenticated;
do $$
declare b1 uuid;b2 uuid;br1 uuid;br2 uuid;br3 uuid;actor uuid;
begin
 select id into actor from auth.users where lower(email)='yastym5@gmail.com';
 if actor is null then raise exception 'approved staging test account missing';end if;
 insert into public.businesses(name,country_code) values('QA Staff Tenant','TR') returning id into b1;
 insert into public.businesses(name,country_code) values('QA Unrelated Tenant','SY') returning id into b2;
 insert into public.branches(business_id,name) values(b1,'Assigned') returning id into br1;
 insert into public.branches(business_id,name) values(b1,'Not Assigned') returning id into br2;
 insert into public.branches(business_id,name) values(b2,'Other Tenant') returning id into br3;
 insert into public.memberships(business_id,user_id,role) values(b1,actor,'staff');
 insert into public.branch_assignments(business_id,branch_id,user_id,branch_role)
 values(b1,br1,actor,'branch_staff');
 insert into isolation_probe values(b1,b2,br1,br2,br3);
end $$;
select set_config('request.jwt.claim.sub',
 (select id::text from auth.users where lower(email)='yastym5@gmail.com'),true);
set local role authenticated;
do $$
declare b1 uuid;b2 uuid;br1 uuid;br2 uuid;br3 uuid;
begin
 select staff_business,other_business,assigned_branch,unassigned_branch,other_branch
 into b1,b2,br1,br2,br3 from isolation_probe;
 if (select count(*) from public.businesses where id in (b1,b2))<>1
 then raise exception 'cross-tenant business leakage';end if;
 if (select count(*) from public.branches where id in (br1,br2,br3))<>1
 then raise exception 'branch assignment isolation broken';end if;
 if not exists(select 1 from public.branches where id=br1)
 then raise exception 'assigned branch hidden';end if;
 if exists(select 1 from public.branches where id in(br2,br3))
 then raise exception 'unauthorized branch visible';end if;
 if (select count(*) from public.memberships where business_id in(b1,b2))<>1
 then raise exception 'membership isolation broken';end if;
end $$;
rollback;
