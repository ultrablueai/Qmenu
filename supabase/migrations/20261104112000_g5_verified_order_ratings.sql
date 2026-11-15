-- Beger G5 pilot: private, verified-after-fulfillment feedback.
-- Public comments are NOT published to customer pages in this phase.
create table if not exists public.g5_order_ratings(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.g3_orders(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 branch_id uuid not null references public.branches(id),
 stars smallint not null check (stars between 1 and 5),
 comment text check (comment is null or char_length(comment)<=280),
 created_at timestamptz not null default now()
);
create index if not exists g5_order_ratings_branch_recent_idx on public.g5_order_ratings(branch_id,created_at desc);
alter table public.g5_order_ratings enable row level security;
revoke all on public.g5_order_ratings from public,anon,authenticated;

-- Possession of the existing unguessable order token is required; only a fulfilled order
-- from the last seven days can be rated. One rating per order, never anonymous free-form reviews.
create or replace function public.g5_submit_order_rating(p_token uuid,p_stars integer,p_comment text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.g3_orders%rowtype; v_comment text;
begin
 if p_token is null or p_stars is null or p_stars not between 1 and 5 then
  raise exception 'Invalid rating' using errcode='22023';
 end if;
 v_comment:=nullif(btrim(coalesce(p_comment,'')),'');
 if char_length(coalesce(v_comment,''))>280 then
  raise exception 'Feedback is too long' using errcode='22023';
 end if;
 select * into v_order from public.g3_orders where public_token=p_token for update;
 if not found or v_order.status<>'fulfilled' or v_order.created_at<now()-interval '7 days' then
  raise exception 'Only recently fulfilled orders may be rated' using errcode='42501';
 end if;
 if exists(select 1 from public.g5_order_ratings where order_id=v_order.id) then
  return jsonb_build_object('submitted',true,'alreadySubmitted',true);
 end if;
 insert into public.g5_order_ratings(order_id,business_id,branch_id,stars,comment)
 values(v_order.id,v_order.business_id,v_order.branch_id,p_stars,v_comment);
 return jsonb_build_object('submitted',true,'alreadySubmitted',false);
exception when unique_violation then
 return jsonb_build_object('submitted',true,'alreadySubmitted',true);
end $$;
revoke all on function public.g5_submit_order_rating(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.g5_submit_order_rating(uuid,integer,text) to anon,authenticated;

-- The holder can check only whether they already submitted feedback; no review body leaks.
create or replace function public.g5_order_rating_state(p_token uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object(
  'eligible',o.status='fulfilled' and o.created_at>=now()-interval '7 days',
  'submitted',exists(select 1 from public.g5_order_ratings r where r.order_id=o.id))
 from public.g3_orders o where o.public_token=p_token
$$;
revoke all on function public.g5_order_rating_state(uuid) from public,anon,authenticated;
grant execute on function public.g5_order_rating_state(uuid) to anon,authenticated;

-- Branch manager report: real ratings only, private comments accessible only to the branch owner/manager.
create or replace function public.g5_branch_ratings(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_business uuid;v_count bigint;v_avg numeric;v_recent jsonb;v_dist jsonb;
begin
 select business_id into v_business from public.branches where id=p_branch;
 if auth.uid() is null or v_business is null or not exists(
  select 1 from public.memberships m
  where m.user_id=auth.uid() and m.business_id=v_business and m.role in ('owner','manager')
 ) then raise exception 'Not authorized for branch reviews' using errcode='42501';end if;
 select count(*),round(avg(stars)::numeric,2) into v_count,v_avg
 from public.g5_order_ratings where branch_id=p_branch and business_id=v_business;
 select coalesce(jsonb_object_agg(star_count.stars,star_count.cnt),'{}'::jsonb) into v_dist
 from (select stars,count(*) cnt from public.g5_order_ratings
       where branch_id=p_branch and business_id=v_business group by stars) star_count;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'stars',x.stars,'comment',x.comment,
  'createdAt',x.created_at,'reference',upper(substr(replace(x.order_id::text,'-',''),1,10)))
  order by x.created_at desc),'[]'::jsonb) into v_recent
 from (select id,order_id,stars,comment,created_at from public.g5_order_ratings
       where branch_id=p_branch and business_id=v_business order by created_at desc limit 40) x;
 return jsonb_build_object('count',v_count,'average',v_avg,'distribution',v_dist,'recent',v_recent);
end $$;
revoke all on function public.g5_branch_ratings(uuid) from public,anon,authenticated;
grant execute on function public.g5_branch_ratings(uuid) to authenticated;
