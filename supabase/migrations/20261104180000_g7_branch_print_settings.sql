-- Beger G7: printer presets per branch, no access to hardware, and no fiscal receipt generation.
create table if not exists public.g7_branch_print_settings(
 branch_id uuid primary key references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 kitchen_paper text not null default '80mm' check(kitchen_paper in ('58mm','80mm','a4')),
 pickup_paper text not null default '58mm' check(pickup_paper in ('58mm','80mm','a4')),
 summary_paper text not null default 'a4' check(summary_paper in ('58mm','80mm','a4')),
 updated_at timestamptz not null default now()
);
alter table public.g7_branch_print_settings enable row level security;
revoke all on public.g7_branch_print_settings from public,anon,authenticated;

create or replace function public.g7_print_settings(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_result jsonb;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for print settings' using errcode='42501';end if;
 select jsonb_build_object('kitchen',coalesce(s.kitchen_paper,'80mm'),
  'pickup',coalesce(s.pickup_paper,'58mm'),'summary',coalesce(s.summary_paper,'a4'))
 into v_result from (select 1) seed left join public.g7_branch_print_settings s
  on s.branch_id=p_branch and s.business_id=v_business;
 return v_result;
end $$;
revoke all on function public.g7_print_settings(uuid) from public,anon,authenticated;
grant execute on function public.g7_print_settings(uuid) to authenticated;

create or replace function public.g7_print_settings_update(p_branch uuid,p_kitchen text,p_pickup text,p_summary text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;
begin
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Not authorized to update print settings' using errcode='42501';end if;
 if p_kitchen is null or p_kitchen not in ('58mm','80mm','a4')
  or p_pickup is null or p_pickup not in ('58mm','80mm','a4')
  or p_summary is null or p_summary not in ('58mm','80mm','a4')
 then raise exception 'Invalid print paper' using errcode='22023';end if;
 insert into public.g7_branch_print_settings(branch_id,business_id,kitchen_paper,pickup_paper,summary_paper)
 values(p_branch,v_business,p_kitchen,p_pickup,p_summary)
 on conflict(branch_id) do update set
 kitchen_paper=excluded.kitchen_paper,
 pickup_paper=excluded.pickup_paper,
 summary_paper=excluded.summary_paper,updated_at=now();
 return jsonb_build_object('kitchen',p_kitchen,'pickup',p_pickup,'summary',p_summary);
end $$;
revoke all on function public.g7_print_settings_update(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.g7_print_settings_update(uuid,text,text,text) to authenticated;
