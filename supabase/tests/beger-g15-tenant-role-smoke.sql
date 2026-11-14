-- Beger G15: read-only staging tenant and station authorization smoke checks.
-- Run with privileged staging SQL tool (not as a normal app user).
-- Uses EXISTING memberships only, temporary jwt settings, and ROLLBACK.
-- Role simulation is not a substitute for signed JWT/browser E2E.
-- If the sample owners/staff are missing, fail closed and report the fixture gap.

-- A. Owner of one business must NOT read a separate business or platform data.
begin;
with sample as (
 select m.user_id,m.business_id,b.id as foreign_id
 from public.memberships m cross join public.businesses b
 where m.role='owner' and b.id<>m.business_id
 and not exists(select 1 from public.memberships z where z.user_id=m.user_id and z.business_id=b.id)
 and not exists(select 1 from public.platform_admins a where a.user_id=m.user_id and a.enabled=true)
 order by m.business_id,b.id limit 1
)
select set_config('request.jwt.claim.sub',user_id::text,true),
 set_config('test.owned_business',business_id::text,true),
 set_config('test.foreign_business',foreign_id::text,true) from sample;
set local role authenticated;
do $$
declare own uuid:=current_setting('test.owned_business')::uuid;
 other uuid:=current_setting('test.foreign_business')::uuid;
 checks integer:=0;
begin
 begin perform public.g12_merchant_subscription_status(own);checks:=checks+1;
 exception when others then raise exception 'own subscription access failed: %',SQLSTATE;end;
 begin perform public.g12_merchant_subscription_status(other);
 raise exception 'foreign subscription allowed';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g13_merchant_requests(own);checks:=checks+1;
 exception when others then raise exception 'own requests access failed: %',SQLSTATE;end;
 begin perform public.g13_merchant_requests(other);
 raise exception 'foreign subscription requests allowed';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g14_platform_launch_preflight();
 raise exception 'merchant obtained platform preflight';
 exception when sqlstate '42501' then checks:=checks+1;end;
 if checks<>5 then raise exception 'owner checks incomplete: %',checks;end if;
end $$;
select 'owner: 5/5' as smoke_result;
rollback;

-- B. A cashier who is not assigned to kitchen can only open their own queue.
begin;
with sample as (
 select c.user_id,c.branch_id,
 (select b.id from public.branches b
  where b.id<>c.branch_id and not exists(
   select 1 from public.memberships m
   where m.user_id=c.user_id and m.business_id=b.business_id
  ) order by b.id limit 1) other_branch
 from public.g10_cashier_staff_branches c
 where not exists(select 1 from public.g9_kitchen_staff_branches k
  where k.user_id=c.user_id and k.branch_id=c.branch_id)
 order by c.branch_id limit 1
)
select set_config('request.jwt.claim.sub',user_id::text,true),
 set_config('test.allowed_branch',branch_id::text,true),
 set_config('test.other_branch',other_branch::text,true) from sample;
set local role authenticated;
do $$
declare own uuid:=current_setting('test.allowed_branch')::uuid;
 other uuid:=current_setting('test.other_branch')::uuid;
 checks integer:=0;
begin
 begin perform public.g10_cashier_queue(own);checks:=checks+1;
 exception when others then raise exception 'own cashier queue failed: %',SQLSTATE;end;
 begin perform public.g10_cashier_queue(other);
 raise exception 'foreign cashier queue allowed';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g9_kitchen_queue(own);
 raise exception 'cashier accessed kitchen without role';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g9_kitchen_queue(other);
 raise exception 'cashier accessed foreign kitchen';
 exception when sqlstate '42501' then checks:=checks+1;end;
 if checks<>4 then raise exception 'cashier checks incomplete: %',checks;end if;
end $$;
select 'cashier: 4/4' as smoke_result;
rollback;

-- C. Pager-only employee can read only their branch's pager tickets.
begin;
with sample as (
 select a.user_id,a.branch_id,
 (select b.id from public.branches b
  where b.id<>a.branch_id and not exists(
   select 1 from public.memberships m
   where m.user_id=a.user_id and m.business_id=b.business_id
  ) order by b.id limit 1) other_branch
 from public.g7_staff_branch_access a
 where not exists(select 1 from public.g10_cashier_staff_branches c
  where c.user_id=a.user_id and c.branch_id=a.branch_id)
 and not exists(select 1 from public.g9_kitchen_staff_branches k
  where k.user_id=a.user_id and k.branch_id=a.branch_id)
 order by a.branch_id limit 1
)
select set_config('request.jwt.claim.sub',user_id::text,true),
 set_config('test.pager_branch',branch_id::text,true),
 set_config('test.pager_other',other_branch::text,true) from sample;
set local role authenticated;
do $$
declare own uuid:=current_setting('test.pager_branch')::uuid;
 other uuid:=current_setting('test.pager_other')::uuid;
 checks integer:=0;
begin
 begin perform public.g6_pager_branch_tickets(own);checks:=checks+1;
 exception when others then raise exception 'own pager tickets failed: %',SQLSTATE;end;
 begin perform public.g6_pager_branch_tickets(other);
 raise exception 'foreign pager tickets allowed';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g10_cashier_queue(own);
 raise exception 'pager worker accessed cashier queue';
 exception when sqlstate '42501' then checks:=checks+1;end;
 begin perform public.g9_kitchen_queue(own);
 raise exception 'pager worker accessed kitchen queue';
 exception when sqlstate '42501' then checks:=checks+1;end;
 if checks<>4 then raise exception 'pager checks incomplete: %',checks;end if;
end $$;
select 'pager: 4/4' as smoke_result;
rollback;
