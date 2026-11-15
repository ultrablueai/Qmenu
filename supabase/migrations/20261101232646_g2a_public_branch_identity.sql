-- G2A: public shop/branch locator, deliberately limited to non-sensitive names.
-- This is NOT a table QR, loyalty identity, ordering authority or catalog publication.
create or replace function public.public_branch_identity(p_branch uuid)
returns table (branch_id uuid, branch_name text, business_name text, country_code text)
language sql stable security definer
set search_path = ''
as $$
  select b.id, b.name, m.name, m.country_code
  from public.branches b
  join public.businesses m on m.id=b.business_id
  where b.id=p_branch
  limit 1
$$;
revoke all on function public.public_branch_identity(uuid) from public;
revoke all on function public.public_branch_identity(uuid) from anon;
revoke all on function public.public_branch_identity(uuid) from authenticated;
grant execute on function public.public_branch_identity(uuid) to anon, authenticated;
comment on function public.public_branch_identity(uuid) is 'G2A intentionally public per-branch display metadata only; never return tenant members, internal business IDs, orders or customer data';