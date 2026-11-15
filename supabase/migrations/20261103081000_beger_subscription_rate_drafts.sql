-- Beger: platform owner-only DRAFT pricing for SaaS feature subscriptions.
-- Never used as merchant entitlements, invoices, or a payment gateway.
create table public.beger_subscription_rate_drafts(
 country text not null check(country in ('TR','SY')),
 rate_key text not null check(rate_key in ('base','additional_branch','qr_catalog','table_orders','counter_queue','kitchen_board','scheduled_pickup','appointments','walkin_queue','digital_pager','customer_loyalty','analytics')),
 monthly_minor bigint not null check(monthly_minor between 0 and 10000000000),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(country,rate_key)
);
alter table public.beger_subscription_rate_drafts enable row level security;
revoke all on public.beger_subscription_rate_drafts from public,anon,authenticated;
grant select(country,rate_key,monthly_minor,updated_at) on public.beger_subscription_rate_drafts to authenticated;
create policy beger_rate_platform_admin_read on public.beger_subscription_rate_drafts
 for select to authenticated using(exists(
 select 1 from public.platform_admins a where a.user_id=(select auth.uid()) and a.enabled and a.role in ('platform_owner','platform_operator')
));
comment on table public.beger_subscription_rate_drafts is 'Internal editable pricing drafts for Beger subscriptions, not published rates, settlements, entitlements or invoices.';

create function public.beger_platform_owner_save_rate_draft(p_country text,p_rate_key text,p_monthly_minor bigint)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_old bigint;
begin
 if v_actor is null or not exists(select 1 from public.platform_admins a
    where a.user_id=v_actor and a.enabled=true and a.role='platform_owner') then
  raise exception 'platform owner required' using errcode='42501';
 end if;
 if p_country not in ('TR','SY') or p_country is null or p_rate_key not in (
  'base','additional_branch','qr_catalog','table_orders','counter_queue','kitchen_board',
  'scheduled_pickup','appointments','walkin_queue','digital_pager','customer_loyalty','analytics'
 ) or p_rate_key is null or p_monthly_minor is null or p_monthly_minor<0 or p_monthly_minor>10000000000 then
   raise exception 'invalid draft rate' using errcode='22023';
 end if;
 select monthly_minor into v_old from public.beger_subscription_rate_drafts
 where country=p_country and rate_key=p_rate_key for update;
 insert into public.beger_subscription_rate_drafts(country,rate_key,monthly_minor,updated_by,updated_at)
 values (p_country,p_rate_key,p_monthly_minor,v_actor,now())
 on conflict(country,rate_key) do update set
 monthly_minor=excluded.monthly_minor,updated_by=excluded.updated_by,updated_at=now();
 insert into public.platform_audit_events(actor_id,action,target_type,details)
 values(v_actor,'subscription_rate_draft_saved','subscription_rate_draft',
 pg_catalog.jsonb_build_object('country',p_country,'rate_key',p_rate_key,
   'previous_minor',v_old,'new_minor',p_monthly_minor));
 return true;
end;
$$;
revoke all on function public.beger_platform_owner_save_rate_draft(text,text,bigint) from public,anon,authenticated;
grant execute on function public.beger_platform_owner_save_rate_draft(text,text,bigint) to authenticated;
