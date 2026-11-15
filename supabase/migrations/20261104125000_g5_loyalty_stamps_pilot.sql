-- Beger G5 loyalty pilot: non-monetary stamps, one per verified fulfilled order.
-- OFF by default. No reward issuance, discounts, redemption or cash equivalent.
create table if not exists public.g5_loyalty_settings(
 branch_id uuid primary key references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 enabled boolean not null default false,
 stamps_target smallint not null default 5 check(stamps_target between 3 and 20),
 updated_at timestamptz not null default now()
);
create table if not exists public.g5_loyalty_wallets(
 id uuid primary key default gen_random_uuid(),
 branch_id uuid not null references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 wallet_token uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now()
);
create table if not exists public.g5_loyalty_stamps(
 id uuid primary key default gen_random_uuid(),
 wallet_id uuid not null references public.g5_loyalty_wallets(id) on delete cascade,
 order_id uuid not null unique references public.g3_orders(id),
 branch_id uuid not null references public.branches(id),
 business_id uuid not null references public.businesses(id),
 created_at timestamptz not null default now()
);
create index if not exists g5_loyalty_wallet_branch_idx on public.g5_loyalty_wallets(branch_id);
create index if not exists g5_loyalty_stamps_wallet_idx on public.g5_loyalty_stamps(wallet_id);
create index if not exists g5_loyalty_stamps_branch_idx on public.g5_loyalty_stamps(branch_id);
alter table public.g5_loyalty_settings enable row level security;
alter table public.g5_loyalty_wallets enable row level security;
alter table public.g5_loyalty_stamps enable row level security;
revoke all on public.g5_loyalty_settings,public.g5_loyalty_wallets,public.g5_loyalty_stamps from public,anon,authenticated;

-- Merchant can configure only an authorized branch. Disabling does not delete existing stamps.
create or replace function public.g5_loyalty_configure(p_branch uuid,p_enabled boolean,p_target integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists (
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for loyalty settings' using errcode='42501';end if;
 if p_enabled is null or p_target is null or p_target not between 3 and 20 then
  raise exception 'Invalid loyalty configuration' using errcode='22023';end if;
 insert into public.g5_loyalty_settings(branch_id,business_id,enabled,stamps_target)
 values(p_branch,v_business,p_enabled,p_target)
 on conflict(branch_id) do update set enabled=excluded.enabled,stamps_target=excluded.stamps_target,updated_at=now();
 return jsonb_build_object('enabled',p_enabled,'target',p_target);
end $$;
revoke all on function public.g5_loyalty_configure(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.g5_loyalty_configure(uuid,boolean,integer) to authenticated;

create or replace function public.g5_loyalty_merchant_status(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists (
  select 1 from public.memberships m where m.business_id=v_business
  and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for loyalty report' using errcode='42501';end if;
 select jsonb_build_object(
  'enabled',coalesce(s.enabled,false),
  'target',coalesce(s.stamps_target,5),
  'wallets',(select count(*) from public.g5_loyalty_wallets w where w.branch_id=p_branch and w.business_id=v_business),
  'stamps',(select count(*) from public.g5_loyalty_stamps x where x.branch_id=p_branch and x.business_id=v_business)
 ) into v_result from (select 1) seed left join public.g5_loyalty_settings s on s.branch_id=p_branch and s.business_id=v_business;
 return v_result;
end $$;
revoke all on function public.g5_loyalty_merchant_status(uuid) from public,anon,authenticated;
grant execute on function public.g5_loyalty_merchant_status(uuid) to authenticated;

-- Holder sees only aggregate stamps and feature settings, never orders, names or identifiers.
create or replace function public.g5_loyalty_card(p_branch uuid,p_wallet_token uuid default null)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'enabled',s.enabled,'target',s.stamps_target,
  'stamps',(select count(*) from public.g5_loyalty_wallets w
    join public.g5_loyalty_stamps x on x.wallet_id=w.id and x.branch_id=s.branch_id
    where w.wallet_token=p_wallet_token and w.branch_id=s.branch_id and w.business_id=s.business_id)
 ) from public.g5_loyalty_settings s
 where s.branch_id=p_branch and s.enabled=true
$$;
revoke all on function public.g5_loyalty_card(uuid,uuid) from public,anon,authenticated;
grant execute on function public.g5_loyalty_card(uuid,uuid) to anon,authenticated;

-- The bearer order token proves eligibility, while optional wallet bearer token links
-- later fulfilled orders in the same branch. No personal data is collected.
create or replace function public.g5_loyalty_claim(p_order_token uuid,p_wallet_token uuid default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype;v_setting public.g5_loyalty_settings%rowtype;
 v_wallet public.g5_loyalty_wallets%rowtype;v_count bigint;
begin
 if p_order_token is null then raise exception 'Order token required' using errcode='22023';end if;
 select * into v_order from public.g3_orders where public_token=p_order_token for update;
 if not found or v_order.status<>'fulfilled' or v_order.created_at<now()-interval '30 days'
 then raise exception 'Only recently fulfilled orders earn stamps' using errcode='42501';end if;
 select * into v_setting from public.g5_loyalty_settings
 where branch_id=v_order.branch_id and business_id=v_order.business_id and enabled=true;
 if not found then raise exception 'Loyalty not enabled for branch' using errcode='42501';end if;
 if exists(select 1 from public.g5_loyalty_stamps where order_id=v_order.id) then
  raise exception 'Order stamp already claimed' using errcode='23505';end if;
 if p_wallet_token is not null then
  select * into v_wallet from public.g5_loyalty_wallets where wallet_token=p_wallet_token
   and branch_id=v_order.branch_id and business_id=v_order.business_id;
  if not found then raise exception 'Loyalty card does not belong to branch' using errcode='42501';end if;
 else
  insert into public.g5_loyalty_wallets(branch_id,business_id)
  values(v_order.branch_id,v_order.business_id) returning * into v_wallet;
 end if;
 insert into public.g5_loyalty_stamps(wallet_id,order_id,branch_id,business_id)
 values(v_wallet.id,v_order.id,v_order.branch_id,v_order.business_id);
 select count(*) into v_count from public.g5_loyalty_stamps where wallet_id=v_wallet.id;
 return jsonb_build_object('walletToken',v_wallet.wallet_token,'stamps',v_count,
   'target',v_setting.stamps_target,'claimed',true);
end $$;
revoke all on function public.g5_loyalty_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.g5_loyalty_claim(uuid,uuid) to anon,authenticated;
