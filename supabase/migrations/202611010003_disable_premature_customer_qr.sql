-- Phase 1 containment: disable premature customer-card APIs until optional loyalty phase.
-- Non-destructive. No customer/branch/scan data is altered. Staging only.
-- These functions remain in schema for later review but cannot be called by anon or authenticated.
revoke execute on function public.issue_business_customer_qr(uuid,text,boolean) from public,anon,authenticated;
revoke execute on function public.rotate_business_customer_qr(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.deactivate_business_customer_qr(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.scan_business_customer_qr(uuid,text) from public,anon,authenticated;
-- Do not apply the speculative 202611010002_customer_self_registration migration.
