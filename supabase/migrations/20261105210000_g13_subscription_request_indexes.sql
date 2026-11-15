-- G13 performance hardening: cover required FK lookup paths and ordered request views.
-- No data mutation and no privilege changes.
create index if not exists g13_subscription_requests_business_recent_idx
 on public.g13_subscription_requests(business_id,created_at desc);
create index if not exists g13_subscription_requests_requested_by_idx
 on public.g13_subscription_requests(requested_by);
create index if not exists g13_subscription_requests_reviewed_by_idx
 on public.g13_subscription_requests(reviewed_by) where reviewed_by is not null;
create index if not exists g13_subscription_requests_status_created_idx
 on public.g13_subscription_requests(status,created_at desc);
