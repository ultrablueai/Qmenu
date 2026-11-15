-- G1 branch management: owner/manager may create or rename branches
-- only inside their own merchant. Staff remains read-only.
-- Requires 202610300001_g1_core.sql.
create policy branches_manager_insert on public.branches
  for insert to authenticated
  with check (
    exists (
      select 1 from public.memberships m
      where m.business_id = branches.business_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','manager')
    )
  );

create policy branches_manager_update on public.branches
  for update to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.business_id = branches.business_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','manager')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.business_id = branches.business_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner','manager')
    )
  );

grant insert (business_id,name) on public.branches to authenticated;
grant update (name) on public.branches to authenticated;
-- No business_id UPDATE grant; branch reassignment is prohibited.
-- No DELETE grant or policy.
