-- Beger G8: immutable, branch-scoped operational collection close.
-- Snapshots merchant-entered payment facts by paid_at. This is NOT bank settlement,
-- physical cash reconciliation, refund accounting, or a fiscal closing receipt.
create table if not exists public.g8_collection_closes(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 period_start timestamptz not null,
 period_end timestamptz not null,
 closed_at timestamptz not null default now(),
 closed_by uuid not null references auth.users(id),
 note text,
 recorded_payments bigint not null check(recorded_payments>=0),
 breakdown jsonb not null,
 check(period_end>period_start and period_end-period_start<=interval '31 hours'),
 check(note is null or char_length(note)<=250),
 unique(branch_id,period_start,period_end)
);
create index if not exists g8_collection_closes_branch_latest_idx
 on public.g8_collection_closes(branch_id,closed_at desc);
alter table public.g8_collection_closes enable row level security;
revoke all on public.g8_collection_closes from public,anon,authenticated;

-- Shared aggregation function used by BOTH preview and write to avoid drifting arithmetic.
-- All currency sums are kept separate; payments are grouped by the merchant's recorded paid_at.
create or replace function public.g8_collection_close_totals(
 p_branch uuid,p_start timestamptz,p_end timestamptz
)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'recordedPayments',count(*),
  'currencies',coalesce((
   select jsonb_agg(jsonb_build_object(
    'currency',c.currency,'records',c.records,
    'totalMinor',c.total_minor,'cashMinor',c.cash_minor,
    'cardMinor',c.card_minor,'transferMinor',c.transfer_minor
   ) order by c.currency)
   from (
    select o.currency,
     count(*) records,
     coalesce(sum(o.total_minor),0) total_minor,
     coalesce(sum(o.total_minor) filter(where o.payment_method='cash'),0) cash_minor,
     coalesce(sum(o.total_minor) filter(where o.payment_method='external_card'),0) card_minor,
     coalesce(sum(o.total_minor) filter(where o.payment_method='external_transfer'),0) transfer_minor
    from public.g3_orders o
    where o.branch_id=p_branch and o.payment_status='paid'
     and o.paid_at>=p_start and o.paid_at<p_end
    group by o.currency
   ) c
  ),'[]'::jsonb)
 )
 from public.g3_orders o
 where o.branch_id=p_branch and o.payment_status='paid'
 and o.paid_at>=p_start and o.paid_at<p_end
$$;
revoke all on function public.g8_collection_close_totals(uuid,timestamptz,timestamptz)
 from public,anon,authenticated;

create or replace function public.g8_collection_close(
 p_branch uuid,p_start timestamptz,p_end timestamptz,
 p_action text default 'preview',p_note text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_data jsonb;v_result public.g8_collection_closes%rowtype;v_note text;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid()
   and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for collection close' using errcode='42501';end if;
 if p_start is null or p_end is null or p_end<=p_start
  or p_end-p_start>interval '31 hours'
  or p_end>now()+interval '1 minute' or p_start<now()-interval '60 days'
 then raise exception 'Invalid close period' using errcode='22023';end if;
 if p_action not in ('preview','close','history') or p_action is null then
  raise exception 'Invalid close action' using errcode='22023';end if;
 if p_action='history' then
  return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',x.id,'start',x.period_start,'end',x.period_end,
     'closedAt',x.closed_at,'note',x.note,'records',x.recorded_payments,
     'currencies',x.breakdown) order by x.closed_at desc)
   from (select * from public.g8_collection_closes
    where branch_id=p_branch and business_id=v_business
    order by closed_at desc limit 30) x
  ),'[]'::jsonb);
 end if;
 if p_action='preview' then
  return jsonb_build_object('start',p_start,'end',p_end,
   'summary',public.g8_collection_close_totals(p_branch,p_start,p_end),
   'overlaps',exists(select 1 from public.g8_collection_closes
    where branch_id=p_branch and period_start<p_end and period_end>p_start));
 end if;
 v_note:=nullif(btrim(coalesce(p_note,'')),'');
 if char_length(coalesce(v_note,''))>250 then raise exception 'Close note too long' using errcode='22023';end if;
 -- Only one closer per branch can snapshot and check overlap concurrently.
 perform pg_advisory_xact_lock(hashtextextended(p_branch::text,12008));
 if exists(select 1 from public.g8_collection_closes
  where branch_id=p_branch and period_start<p_end and period_end>p_start)
 then raise exception 'Collection period already closed or overlaps an existing close'
  using errcode='23505';end if;
 v_data:=public.g8_collection_close_totals(p_branch,p_start,p_end);
 insert into public.g8_collection_closes
  (business_id,branch_id,period_start,period_end,closed_by,note,recorded_payments,breakdown)
 values(v_business,p_branch,p_start,p_end,auth.uid(),v_note,
  (v_data->>'recordedPayments')::bigint,v_data->'currencies')
 returning * into v_result;
 return jsonb_build_object('id',v_result.id,'start',v_result.period_start,
  'end',v_result.period_end,'closedAt',v_result.closed_at,
  'records',v_result.recorded_payments,'currencies',v_result.breakdown);
end $$;
revoke all on function public.g8_collection_close(uuid,timestamptz,timestamptz,text,text)
 from public,anon,authenticated;
grant execute on function public.g8_collection_close(uuid,timestamptz,timestamptz,text,text)
 to authenticated;

-- The snapshot is append-only to all application roles.
-- This prevents accidental modifications even if later grants are expanded.
create or replace function public.g8_reject_collection_close_mutation()
returns trigger language plpgsql set search_path=''
as $$
begin
 raise exception 'Collection close snapshots cannot be modified or deleted'
  using errcode='42501';
end $$;
revoke all on function public.g8_reject_collection_close_mutation()
 from public,anon,authenticated;
drop trigger if exists g8_collection_close_immutable on public.g8_collection_closes;
create trigger g8_collection_close_immutable before update or delete
 on public.g8_collection_closes for each row
 execute function public.g8_reject_collection_close_mutation();
