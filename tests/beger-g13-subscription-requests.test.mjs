import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/20261105200000_g13_subscription_service_requests.sql","utf8");
const merchant=readFileSync("app/dashboard/merchant-subscription-requests.tsx","utf8");
const panel=readFileSync("app/dashboard/merchant-subscription-status.tsx","utf8");
const admin=readFileSync("app/admin/subscription-service-requests.tsx","utf8");
const adminPage=readFileSync("app/admin/page.tsx","utf8");
const dash=readFileSync("app/dashboard/page.tsx","utf8");

test("G13 invitation-style request data denies anon/table reads and prevents duplicate pending requests",()=>{
 assert.match(sql,/alter table public\.g13_subscription_requests enable row level security/);
 assert.match(sql,/revoke all on public\.g13_subscription_requests from public,anon,authenticated/);
 assert.match(sql,/create unique index g13_one_pending_per_business on public\.g13_subscription_requests\(business_id\) where status='pending'/);
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock/);
 for(const [fn,sig] of [["g13_subscription_request","uuid,text"],["g13_merchant_requests","uuid"],["g13_withdraw_request","uuid"],["g13_platform_request_queue",""],["g13_platform_resolve_request","uuid,text"]]){
  assert.ok(sql.includes("revoke all on function public."+fn+"("+sig+") from public,anon,authenticated;"));
  assert.ok(sql.includes("grant execute on function public."+fn+"("+sig+") to authenticated;"));
 }
});
test("G13 owner requests are scoped to membership and never activate, price, or bill",()=>{
 assert.match(sql,/m\.business_id=p_business and m\.user_id=auth\.uid\(\) and m\.role='owner'/);
 assert.match(sql,/p_kind not in \('trial','plan_review','renewal','cancellation'\)/);
 assert.match(sql,/p_kind='trial' and v_sub_exists/);
 assert.match(sql,/p_kind in \('renewal','cancellation'\) and not v_sub_exists/);
 const requestFn=sql.split("function public.g13_subscription_request")[1].split("end $$;")[0];
 assert.doesNotMatch(requestFn,/insert into public\.subscriptions|update public\.subscriptions|delete from public\.subscriptions/);
 assert.match(requestFn,/insert into public\.platform_audit_events/);
});
test("G13 owner-only withdraw and platform-owner-only review are serialized and audited",()=>{
 const withdraw=sql.split("function public.g13_withdraw_request")[1].split("end $$;")[0];
 const resolve=sql.split("function public.g13_platform_resolve_request")[1].split("end $$;")[0];
 assert.match(withdraw,/where r\.id=p_request for update/);
 assert.match(withdraw,/m\.role='owner'/);
 assert.match(withdraw,/where id=p_request and status='pending'/);
 assert.match(resolve,/p\.role='platform_owner'/);
 assert.match(resolve,/p_decision not in \('acknowledged','declined'\)/);
 assert.match(resolve,/where r\.id=p_request for update/);
 assert.match(resolve,/where id=p_request and status='pending'/);
 assert.doesNotMatch(resolve,/(?:insert into|update|delete from) public\.(?:subscriptions|g3_payment_events|plans)/);
 assert.match(resolve,/insert into public\.platform_audit_events/);
});
test("G13 merchant controls are read-only for managers and cannot bypass a pending request",()=>{
 assert.match(dash,/canRequest=\{currentRole==="owner"\}/);
 assert.match(panel,/MerchantSubscriptionRequests businessId=\{businessId\}/);
 assert.match(merchant,/g13_subscription_request/);
 assert.match(merchant,/g13_withdraw_request/);
 assert.match(merchant,/g13_merchant_requests/);
 assert.match(merchant,/if\(!canRequest\|\|busy\|\|loading\|\|pending\|\|error/);
 assert.match(merchant,/item\.status==="pending"/);
 assert.match(merchant,/الطلب لا يغيّر اشتراكك تلقائياً ولا يُنشئ فاتورة/);
});
test("G13 platform review is visible to operators but decisions require platform owner",()=>{
 assert.match(adminPage,/<PlatformSubscriptionRequests canReview=\{owner\}\/>/);
 assert.match(admin,/g13_platform_request_queue/);
 assert.match(admin,/g13_platform_resolve_request/);
 assert.match(admin,/if\(!canReview\|\|busy/);
 assert.match(admin,/لا يفعّل اشتراكاً أو يحصّل أموالاً/);
});
