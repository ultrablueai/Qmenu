-- Beger G1 read-only Staging account/branch integrity audit.
-- No impersonation, DDL, data writes, security-role switches or secrets.
-- This validates relational consistency, NOT real browser sessions.
WITH members AS (
  SELECT business_id, user_id, role FROM public.memberships
), checks AS (
  SELECT
    (SELECT count(*) FROM members WHERE role = 'owner') AS owner_memberships,
    (SELECT count(*) FROM (SELECT user_id FROM members GROUP BY user_id HAVING count(*) > 1) q) AS users_with_multi_business,
    (SELECT count(*) FROM (SELECT business_id FROM members WHERE role = 'owner' GROUP BY business_id HAVING count(*) <> 1) q) AS businesses_with_nonunique_owner,
    (SELECT count(*) FROM public.branch_assignments ba
      WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.business_id = ba.business_id AND m.user_id = ba.user_id)
    ) AS assignments_without_membership,
    (SELECT count(*) FROM public.branch_assignments ba
      WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.id = ba.branch_id AND b.business_id = ba.business_id)
    ) AS assignments_wrong_business,
    (SELECT count(*) FROM public.branches b
      WHERE NOT EXISTS (SELECT 1 FROM public.businesses v WHERE v.id = b.business_id)
    ) AS orphan_branches,
    (SELECT count(*) FROM public.platform_admins pa WHERE pa.enabled
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pa.user_id AND u.email_confirmed_at IS NOT NULL)
    ) AS enabled_unconfirmed_admins
)
SELECT *,
  (users_with_multi_business = 0
  AND businesses_with_nonunique_owner = 0
  AND assignments_without_membership = 0
  AND assignments_wrong_business = 0
  AND orphan_branches = 0
  AND enabled_unconfirmed_admins = 0) AS consistency_pass
FROM checks;
