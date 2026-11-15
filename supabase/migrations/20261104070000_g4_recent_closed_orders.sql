-- Beger G4 Staging: seven-day merchant-scoped archive, separate from live kitchen queue.
-- Completed and rejected orders never re-enter the new-order alert stream.
create or replace function public.g4_recent_closed_orders(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid; v_orders jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or not exists(select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')) then
  raise exception 'Not authorized for branch orders' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',o.id,'table',o.table_label,'serviceMode',o.service_mode,
  'status',o.status,'paymentStatus',o.payment_status,'paymentMethod',o.payment_method,
  'totalMinor',o.total_minor,'currency',o.currency,'createdAt',o.created_at,
  'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name_ar,'quantity',i.quantity,'selections',i.selections) order by i.id) from public.g3_order_items i where i.order_id=o.id),'[]'::jsonb)
 ) order by o.created_at desc),'[]'::jsonb) into v_orders
 from (select * from public.g3_orders where branch_id=p_branch and status in ('fulfilled','rejected') and created_at >= now()-interval '7 days' order by created_at desc limit 50) o;
 return v_orders;
end $$;
revoke all on function public.g4_recent_closed_orders(uuid) from public,anon;
grant execute on function public.g4_recent_closed_orders(uuid) to authenticated;


