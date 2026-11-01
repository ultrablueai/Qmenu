-- G2 correction: customer registers themself after scanning a shop/branch QR.
-- Customer identity is stable across branches of ONE business. The shop QR is a link, not a customer credential.
alter table public.business_customers
 add column customer_user_id uuid references auth.users(id) on delete set null,
 add constraint business_customers_business_user_unique unique (business_id,customer_user_id);
create index business_customers_user_idx on public.business_customers(customer_user_id) where customer_user_id is not null;

-- Merchant may no longer create customers or rotate cards on a customer's behalf.
revoke execute on function public.issue_business_customer_qr(uuid,text,boolean) from authenticated;
revoke execute on function public.rotate_business_customer_qr(uuid,uuid) from authenticated;

-- Public metadata only, for an unguessable-enough UUID linked from a merchant-presented branch QR.
create function public.public_customer_join_context(p_branch uuid)
returns table(business_id uuid,business_name text,branch_name text)
language sql stable security definer set search_path=''
as $$
 select b.id,b.name,br.name
 from public.branches br join public.businesses b on b.id=br.business_id
 where br.id=p_branch limit 1
$$;
revoke all on function public.public_customer_join_context(uuid) from public,anon,authenticated;
grant execute on function public.public_customer_join_context(uuid) to anon,authenticated;

-- Self-enrollment only: valid Supabase account + verified email + affirmative consent.
-- A row already linked to the same user/business is returned without issuing a second identity.
create function public.self_enroll_business_customer(p_branch uuid,p_name text,p_consent boolean)
returns table(customer_id uuid,qr_code text,enrollment_status text)
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());
 v_business uuid; v_confirmed timestamptz; v_existing uuid; v_token text; v_new uuid;
begin
 if v_actor is null then raise exception 'login required' using errcode='28000'; end if;
 select u.email_confirmed_at into v_confirmed from auth.users u where u.id=v_actor;
 if v_confirmed is null then raise exception 'email confirmation required' using errcode='42501'; end if;
 if p_consent is distinct from true then raise exception 'consent required' using errcode='22023'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 100 then
  raise exception 'invalid display name' using errcode='22023'; end if;
 select br.business_id into v_business from public.branches br where br.id=p_branch;
 if v_business is null then raise exception 'unknown branch' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||v_business::text,0));
 select c.id into v_existing from public.business_customers c
 where c.business_id=v_business and c.customer_user_id=v_actor;
 if v_existing is not null then
  return query select v_existing,null::text,'existing'::text;
  return;
 end if;
 v_token:='QMB1.'||encode(extensions.gen_random_bytes(32),'hex');
 insert into public.business_customers(business_id,customer_user_id,display_name,qr_hash,consent_at)
 values(v_business,v_actor,trim(p_name),encode(extensions.digest(v_token,'sha256'),'hex'),now())
 returning id into v_new;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(v_business,v_actor,'customer_self_enrolled',
  pg_catalog.jsonb_build_object('customer_id',v_new,'branch_id',p_branch));
 return query select v_new,v_token,'created'::text;
end;
$$;

create function public.self_rotate_business_customer_qr(p_business uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid()); v_token text; v_customer uuid;
begin
 if v_actor is null then raise exception 'unauthorized' using errcode='28000'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||p_business::text,0));
 select c.id into v_customer from public.business_customers c
 where c.business_id=p_business and c.customer_user_id=v_actor and c.active=true;
 if v_customer is null then raise exception 'customer not enrolled' using errcode='42501'; end if;
 v_token:='QMB1.'||encode(extensions.gen_random_bytes(32),'hex');
 update public.business_customers set qr_hash=encode(extensions.digest(v_token,'sha256'),'hex')
 where id=v_customer and business_id=p_business and customer_user_id=v_actor;
 insert into public.audit_logs(business_id,actor_id,event_type,payload)
 values(p_business,v_actor,'customer_self_rotated',pg_catalog.jsonb_build_object('customer_id',v_customer));
 return v_token;
end;
$$;

create function public.self_business_customer_status(p_business uuid)
returns table(customer_id uuid,display_name text,active boolean)
language sql stable security definer set search_path=''
as $$
 select c.id,c.display_name,c.active from public.business_customers c
 where c.business_id=p_business and c.customer_user_id=(select auth.uid())
 limit 1
$$;
revoke all on function public.self_enroll_business_customer(uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.self_rotate_business_customer_qr(uuid) from public,anon,authenticated;
revoke all on function public.self_business_customer_status(uuid) from public,anon,authenticated;
grant execute on function public.self_enroll_business_customer(uuid,text,boolean) to authenticated;
grant execute on function public.self_rotate_business_customer_qr(uuid) to authenticated;
grant execute on function public.self_business_customer_status(uuid) to authenticated;
