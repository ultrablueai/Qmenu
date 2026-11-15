-- Beger G4: read-only, tenant-scoped financial and operational snapshot.
-- Orders are grouped by creation time; recorded collection is grouped by paid_at.
-- Do not sum across currencies or claim these figures are verified bank deposits.
create or replace function public.g4_branch_report(p_branch uuid,p_start timestamptz,p_end timestamptz)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_business uuid;
 v_orders jsonb;
 v_collections jsonb;
 v_counts jsonb;
begin
 if p_start is null or p_end is null or p_end<=p_start or p_end-p_start>interval '31 days'
    or p_end>now()+interval '1 day' then
  raise exception 'Invalid reporting period' using errcode='22023';
 end if;
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for branch report' using errcode='42501';end if;

 select jsonb_build_object(
  'orders',count(*),
  'pending',count(*) filter(where o.status='pending'),
  'accepted',count(*) filter(where o.status='accepted'),
  'preparing',count(*) filter(where o.status='preparing'),
  'ready',count(*) filter(where o.status='ready'),
  'fulfilled',count(*) filter(where o.status='fulfilled'),
  'rejected',count(*) filter(where o.status='rejected'),
  'dineIn',count(*) filter(where o.service_mode='dine_in'),
  'takeaway',count(*) filter(where o.service_mode='takeaway')
 ) into v_counts
 from public.g3_orders o
 where o.branch_id=p_branch and o.business_id=v_business
 and o.created_at>=p_start and o.created_at<p_end;

 select coalesce(jsonb_agg(jsonb_build_object(
  'currency',amounts.currency,
  'grossOrderMinor',amounts.gross_order_minor,
  'outstandingMinor',amounts.outstanding_minor
 ) order by amounts.currency),'[]'::jsonb) into v_orders
 from (
  select o.currency,
   coalesce(sum(o.total_minor) filter(where o.status<>'rejected'),0) as gross_order_minor,
   coalesce(sum(o.total_minor) filter(where o.status<>'rejected' and o.payment_status='unpaid'),0) as outstanding_minor
  from public.g3_orders o
  where o.branch_id=p_branch and o.business_id=v_business and o.created_at>=p_start and o.created_at<p_end
  group by o.currency
 ) amounts;

 select coalesce(jsonb_agg(jsonb_build_object('currency',payments.currency,
  'collectedMinor',payments.collected_minor,'cashMinor',payments.cash_minor,
  'cardMinor',payments.card_minor,'transferMinor',payments.transfer_minor
 ) order by payments.currency),'[]'::jsonb) into v_collections
 from (
  select o.currency,
   coalesce(sum(o.total_minor),0) as collected_minor,
   coalesce(sum(o.total_minor) filter(where o.payment_method='cash'),0) as cash_minor,
   coalesce(sum(o.total_minor) filter(where o.payment_method='external_card'),0) as card_minor,
   coalesce(sum(o.total_minor) filter(where o.payment_method='external_transfer'),0) as transfer_minor
  from public.g3_orders o
  where o.branch_id=p_branch and o.business_id=v_business
   and o.payment_status='paid' and o.paid_at>=p_start and o.paid_at<p_end
  group by o.currency
 ) payments;

 return jsonb_build_object(
  'start',p_start,'end',p_end,'counts',v_counts,'orderTotals',v_orders,
  'recordedCollections',v_collections,
  'basis','orders_by_created_at_collections_by_paid_at',
  'disclaimer','Merchant-recorded collection only; not verified bank settlement or tax totals'
 );
end $$;
revoke all on function public.g4_branch_report(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.g4_branch_report(uuid,timestamptz,timestamptz) to authenticated;
