-- G38: Keep the canonical order event ledger complete for every authorized station.
-- Staging-only candidate. Apply only after CI, tenant isolation tests and approval.
-- Existing G17/G23 AFTER UPDATE triggers remain responsible for print/notifications.

create or replace function public.g9_kitchen_advance(p_order uuid, p_next text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_order public.g3_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not public.g9_kitchen_allowed(v_order.branch_id) then
  raise exception 'Kitchen update forbidden' using errcode='42501';end if;
 if not ((v_order.status='accepted' and p_next='preparing')
    or (v_order.status='preparing' and p_next='ready')) then
  raise exception 'Invalid kitchen transition' using errcode='22023';end if;
 update public.g3_orders set status=p_next,updated_at=now() where id=v_order.id;
 insert into public.g9_kitchen_events(business_id,branch_id,order_id,actor_id,from_status,to_status)
 values(v_order.business_id,v_order.branch_id,v_order.id,auth.uid(),v_order.status,p_next);
 insert into public.g3_order_events(order_id,old_status,new_status,actor_id)
 values(v_order.id,v_order.status,p_next,auth.uid());
 return jsonb_build_object('id',v_order.id,'status',p_next);
end $$;

create or replace function public.g10_cashier_order_action(p_order uuid, p_next text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_order public.g3_orders%rowtype;
begin
 select * into v_order from public.g3_orders where id=p_order for update;
 if not found or not public.g10_cashier_allowed(v_order.branch_id) then
  raise exception 'Cashier action forbidden' using errcode='42501';end if;
 if not ((v_order.status='pending' and p_next='accepted')
   or (v_order.status='ready' and p_next='fulfilled')) then
  raise exception 'Invalid cashier order transition' using errcode='22023';end if;
 update public.g3_orders set status=p_next,updated_at=now() where id=p_order;
 insert into public.g3_order_events(order_id,old_status,new_status,actor_id)
 values(v_order.id,v_order.status,p_next,auth.uid());
 return jsonb_build_object('id',p_order,'status',p_next);
end $$;

-- Do not change existing EXECUTE grants or station authorization policy.
-- Both inserts and order transitions are atomic in the same transaction.
