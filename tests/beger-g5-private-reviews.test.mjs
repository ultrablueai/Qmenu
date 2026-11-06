import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync("supabase/migrations/20261104112000_g5_verified_order_ratings.sql","utf8");
const guest=readFileSync("components/guest-order-rating.tsx","utf8");
const watcher=readFileSync("components/guest-order-watcher.tsx","utf8");
const admin=readFileSync("app/dashboard/merchant-reviews.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");

test("order ratings use RLS, private storage and one completed order per rating",()=>{
 assert.match(sql,/order_id uuid not null unique references public\.g3_orders/);
 assert.match(sql,/stars smallint not null check \(stars between 1 and 5\)/);
 assert.match(sql,/alter table public\.g5_order_ratings enable row level security/);
 assert.match(sql,/revoke all on public\.g5_order_ratings from public,anon,authenticated/);
 assert.match(sql,/public_token=p_token for update/);
 assert.match(sql,/v_order\.status<>'fulfilled'/);
 assert.match(sql,/v_order\.created_at<now\(\)-interval '7 days'/);
 assert.match(sql,/p_stars not between 1 and 5/);
 assert.match(sql,/char_length\(coalesce\(v_comment,''\)\)>280/);
 assert.match(sql,/exception when unique_violation/);
});
test("anonymous readers only use token-scoped functions and cannot read raw reviews",()=>{
 assert.match(sql,/revoke all on function public\.g5_order_rating_state\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g5_order_rating_state\(uuid\) to anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g5_submit_order_rating\(uuid,integer,text\) to anon,authenticated/);
 assert.match(sql,/select jsonb_build_object\(/);
 assert.match(sql,/exists\(select 1 from public\.g5_order_ratings r where r\.order_id=o\.id\)/);
 assert.doesNotMatch(sql,/grant select on public\.g5_order_ratings to anon/);
});
test("only business owner or manager sees review details for selected branch",()=>{
 assert.match(sql,/m\.user_id=auth\.uid\(\) and m\.business_id=v_business and m\.role in \('owner','manager'\)/);
 assert.match(sql,/where branch_id=p_branch and business_id=v_business/);
 assert.match(sql,/order by created_at desc limit 40/);
 assert.match(sql,/revoke all on function public\.g5_branch_ratings\(uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.g5_branch_ratings\(uuid\) to authenticated/);
 assert.match(admin,/g5_branch_ratings/);
 assert.match(admin,/report\.distribution/);
 assert.match(admin,/report\.recent\.map/);
 assert.match(hq,/workspace==="reviews"/);
});
test("customer may rate only fulfilled orders after tracking, with one to five stars",()=>{
 assert.match(watcher,/order\.status==="fulfilled"\?<GuestOrderRating/);
 assert.match(guest,/g5_order_rating_state/);
 assert.match(guest,/g5_submit_order_rating/);
 assert.match(guest,/\[1,2,3,4,5\]\.map/);
 assert.match(guest,/maxLength=\{280\}/);
 assert.match(guest,/setSubmitted\(true\)/);
 assert.match(guest,/your note is visible only to store management/i);
});
