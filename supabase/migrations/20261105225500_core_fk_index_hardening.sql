-- Beger G14 release-hardening: FK indexes for the core order, kitchen, pager and invitation paths.
-- No DML, RLS grants, entitlement or Production changes.
create index if not exists g3_order_events_order_id_fk_idx on public.g3_order_events(order_id);
create index if not exists g3_order_items_order_id_fk_idx on public.g3_order_items(order_id);
create index if not exists g3_order_items_product_id_fk_idx on public.g3_order_items(product_id);
create index if not exists g3_orders_business_id_fk_idx on public.g3_orders(business_id);
create index if not exists g6_pager_tickets_business_id_fk_idx on public.g6_pager_tickets(business_id);
create index if not exists g9_kitchen_events_actor_id_fk_idx on public.g9_kitchen_events(actor_id);
create index if not exists g9_kitchen_events_branch_id_fk_idx on public.g9_kitchen_events(branch_id);
create index if not exists g9_kitchen_events_business_id_fk_idx on public.g9_kitchen_events(business_id);
create index if not exists g11_staff_invitations_business_id_fk_idx on public.g11_staff_invitations(business_id);
create index if not exists g11_staff_invitations_accepted_by_fk_idx on public.g11_staff_invitations(accepted_by);
create index if not exists g11_staff_invitations_invited_by_fk_idx on public.g11_staff_invitations(invited_by);
create index if not exists g10_cashier_staff_branches_business_fk_idx on public.g10_cashier_staff_branches(business_id);
create index if not exists g9_kitchen_staff_branches_business_fk_idx on public.g9_kitchen_staff_branches(business_id);
create index if not exists g7_staff_branch_access_user_fk_idx on public.g7_staff_branch_access(user_id);
