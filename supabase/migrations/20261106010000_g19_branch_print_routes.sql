-- Beger G19: branch-scoped print destination profiles.
-- Configuration only. No hardware claims, outbound print, secrets or device pairing.
create table public.g19_branch_print_routes(
 branch_id uuid not null references public.branches(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 kind text not null check(kind in ('kitchen','pickup','summary')),
 destination_name text not null check(char_length(destination_name) between 1 and 80),
 paper_mode text not null default 'browser_manual' check(paper_mode='browser_manual'),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(branch_id,kind)
);
create index g19_branch_print_routes_business_idx on public.g19_branch_print_routes(business_id);
create index g19_branch_print_routes_updated_by_idx on public.g19_branch_print_routes(updated_by);
alter table public.g19_branch_print_routes enable row level security;
revoke all on public.g19_branch_print_routes from public,anon,authenticated;

create or replace function public.g19_branch_print_routes(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.branches b join public.memberships m on m.business_id=b.business_id
  where b.id=p_branch and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Branch printer routes forbidden' using errcode='42501'; end if;
 select pg_catalog.jsonb_build_object(
  'kitchen',coalesce((select r.destination_name from public.g19_branch_print_routes r where r.branch_id=p_branch and r.kind='kitchen'),'مطبخ الفرع'),
  'pickup',coalesce((select r.destination_name from public.g19_branch_print_routes r where r.branch_id=p_branch and r.kind='pickup'),'بطاقات الاستلام'),
  'summary',coalesce((select r.destination_name from public.g19_branch_print_routes r where r.branch_id=p_branch and r.kind='summary'),'كاشير الفرع'),
  'mode','browser_manual',
  'device_connected',false
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.g19_branch_print_routes(uuid) from public,anon,authenticated;
grant execute on function public.g19_branch_print_routes(uuid) to authenticated;

create or replace function public.g19_update_print_route(
 p_branch uuid,p_kind text,p_destination text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_business uuid;v_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select b.business_id into v_business from public.branches b where b.id=p_branch;
 if v_business is null or not exists(
  select 1 from public.memberships m
  where m.business_id=v_business and m.user_id=auth.uid() and m.role in ('owner','manager')
 ) then raise exception 'Branch printer update forbidden' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('kitchen','pickup','summary') then
  raise exception 'Invalid printer destination kind' using errcode='22023';end if;
 v_name:=nullif(pg_catalog.btrim(coalesce(p_destination,'')),'');
 if v_name is null or char_length(v_name)>80 or
    pg_catalog.position(chr(10) in v_name)>0 or pg_catalog.position(chr(13) in v_name)>0 then
  raise exception 'Invalid printer destination name' using errcode='22023';end if;

 insert into public.g19_branch_print_routes(branch_id,business_id,kind,destination_name,updated_by)
 values(p_branch,v_business,p_kind,v_name,auth.uid())
 on conflict(branch_id,kind) do update
 set destination_name=excluded.destination_name,updated_at=now(),updated_by=auth.uid();
 return pg_catalog.jsonb_build_object('kind',p_kind,'destination',v_name,'mode','browser_manual');
end $$;
revoke all on function public.g19_update_print_route(uuid,text,text) from public,anon,authenticated;
grant execute on function public.g19_update_print_route(uuid,text,text) to authenticated;
