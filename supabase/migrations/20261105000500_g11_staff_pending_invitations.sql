-- Beger G11: pending employee invitations; owner defines a branch role,
-- invited verified employee explicitly accepts. No email service or auth admin key.
create table if not exists public.g11_staff_invitations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 branch_id uuid not null references public.branches(id) on delete cascade,
 email text not null,
 role text not null check(role in ('cashier','kitchen','pager')),
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '14 days'),
 accepted_by uuid references auth.users(id),
 accepted_at timestamptz,
 revoked_at timestamptz,
 unique(branch_id,email,role),
 check(email=lower(btrim(email)) and char_length(email)<=254),
 check((accepted_by is null)=(accepted_at is null))
);
alter table public.g11_staff_invitations enable row level security;
revoke all on public.g11_staff_invitations from public,anon,authenticated;
create index if not exists g11_staff_invitations_email_idx on public.g11_staff_invitations(email,expires_at)
where accepted_at is null and revoked_at is null;

create or replace function public.g11_staff_invite(p_branch uuid,p_email text,p_role text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_email text;v_id uuid;v_count integer;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists (
  select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Staff invitations restricted to branch owner' using errcode='42501';end if;
 v_email:=lower(btrim(coalesce(p_email,'')));
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email)>254
 or p_role not in ('cashier','kitchen','pager') or p_role is null
 then raise exception 'Invalid invitation details' using errcode='22023';end if;
 select count(*) into v_count from public.g11_staff_invitations i
 where i.branch_id=p_branch and i.revoked_at is null and i.accepted_at is null and i.expires_at>now();
 if v_count>=100 and not exists (select 1 from public.g11_staff_invitations
   where branch_id=p_branch and email=v_email and role=p_role)
 then raise exception 'Branch invitation limit reached' using errcode='22023';end if;
 insert into public.g11_staff_invitations(business_id,branch_id,email,role,invited_by)
 values(v_business,p_branch,v_email,p_role,auth.uid())
 on conflict(branch_id,email,role) do update set
 business_id=excluded.business_id,invited_by=excluded.invited_by,
 created_at=now(),expires_at=now()+interval '14 days',
 revoked_at=null,accepted_at=null,accepted_by=null
 returning id into v_id;
 return jsonb_build_object('id',v_id,'status','pending','role',p_role);
end $$;
revoke all on function public.g11_staff_invite(uuid,text,text) from public,anon,authenticated;
grant execute on function public.g11_staff_invite(uuid,text,text) to authenticated;

create or replace function public.g11_my_invitations()
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',i.id,'role',i.role,'businessName',biz.name,'branchName',b.name,'expiresAt',i.expires_at
 ) order by i.created_at desc),'[]'::jsonb)
 from public.g11_staff_invitations i
 join public.branches b on b.id=i.branch_id and b.business_id=i.business_id
 join public.businesses biz on biz.id=i.business_id
 join auth.users u on u.id=auth.uid()
 where i.email=lower(u.email) and u.email_confirmed_at is not null
 and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
$$;
revoke all on function public.g11_my_invitations() from public,anon,authenticated;
grant execute on function public.g11_my_invitations() to authenticated;

create or replace function public.g11_accept_invitation(p_invitation uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_inv public.g11_staff_invitations%rowtype;v_email text;v_role text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select lower(u.email) into v_email from auth.users u
 where u.id=auth.uid() and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'Verified email required' using errcode='42501';end if;
 select * into v_inv from public.g11_staff_invitations where id=p_invitation for update;
 if not found or v_inv.email<>v_email or v_inv.revoked_at is not null or v_inv.expires_at<=now()
 then raise exception 'Invitation unavailable or expired' using errcode='42501';end if;
 if v_inv.accepted_at is not null then raise exception 'Invitation already used' using errcode='22023';end if;
 if not exists(select 1 from public.branches b where b.id=v_inv.branch_id and b.business_id=v_inv.business_id)
 then raise exception 'Branch not available' using errcode='42501';end if;
 select m.role into v_role from public.memberships m
 where m.business_id=v_inv.business_id and m.user_id=auth.uid() for update;
 if v_role is not null and v_role<>'staff'
 then raise exception 'Owner or manager cannot accept staff role' using errcode='42501';end if;
 insert into public.memberships(business_id,user_id,role)
 values(v_inv.business_id,auth.uid(),'staff') on conflict(business_id,user_id) do nothing;
 if v_inv.role='cashier' then
  insert into public.g10_cashier_staff_branches(business_id,branch_id,user_id)
  values(v_inv.business_id,v_inv.branch_id,auth.uid()) on conflict(branch_id,user_id) do nothing;
 elsif v_inv.role='kitchen' then
  insert into public.g9_kitchen_staff_branches(business_id,branch_id,user_id)
  values(v_inv.business_id,v_inv.branch_id,auth.uid()) on conflict(branch_id,user_id) do nothing;
 elsif v_inv.role='pager' then
  insert into public.g7_staff_branch_access(business_id,branch_id,user_id)
  values(v_inv.business_id,v_inv.branch_id,auth.uid()) on conflict(branch_id,user_id) do nothing;
 end if;
 update public.g11_staff_invitations set accepted_by=auth.uid(),accepted_at=now() where id=p_invitation;
 return jsonb_build_object('assigned',true,'role',v_inv.role,'branchId',v_inv.branch_id);
end $$;
revoke all on function public.g11_accept_invitation(uuid) from public,anon,authenticated;
grant execute on function public.g11_accept_invitation(uuid) to authenticated;

create or replace function public.g11_owner_invitations(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
 select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Invitation list forbidden' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',i.id,'email',i.email,'role',i.role,'expiresAt',i.expires_at,
 'status',case when i.revoked_at is not null then 'revoked' when i.accepted_at is not null then 'accepted'
 when i.expires_at<=now() then 'expired' else 'pending' end)
 order by i.created_at desc),'[]'::jsonb) into v_result
 from public.g11_staff_invitations i where i.branch_id=p_branch and i.business_id=v_business;
 return v_result;
end $$;
revoke all on function public.g11_owner_invitations(uuid) from public,anon,authenticated;
grant execute on function public.g11_owner_invitations(uuid) to authenticated;

create or replace function public.g11_revoke_invitation(p_invitation uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_branch uuid;v_business uuid;
begin
 select branch_id,business_id into v_branch,v_business from public.g11_staff_invitations where id=p_invitation for update;
 if auth.uid() is null or v_branch is null or not exists(
 select 1 from public.memberships m where m.business_id=v_business and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Invitation revocation forbidden' using errcode='42501';end if;
 update public.g11_staff_invitations set revoked_at=now() where id=p_invitation and accepted_at is null;
 return jsonb_build_object('revoked',found);
end $$;
revoke all on function public.g11_revoke_invitation(uuid) from public,anon,authenticated;
grant execute on function public.g11_revoke_invitation(uuid) to authenticated;
