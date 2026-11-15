import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const fix=readFileSync("supabase/migrations/20261105213000_g13_pending_queue_priority.sql","utf8");
const merchant=readFileSync("app/dashboard/merchant-subscription-requests.tsx","utf8");
const platform=readFileSync("app/admin/subscription-service-requests.tsx","utf8");

test("G13 platform queue keeps pending-first priority in both SQL selection and JSON order",()=>{
 assert.match(fix,/order by case when r\.status='pending' then 0 else 1 end,\s*r\.created_at desc/);
 assert.match(fix,/order by case when sr\.status='pending' then 0 else 1 end, sr\.created_at desc/);
 assert.match(fix,/limit 100/);
 assert.match(fix,/p\.role in \('platform_owner','platform_operator'\)/);
 assert.match(fix,/revoke all on function public\.g13_platform_request_queue\(\) from public,anon,authenticated/);
 assert.match(fix,/grant execute on function public\.g13_platform_request_queue\(\) to authenticated/);
 assert.doesNotMatch(fix,/\b(?:delete from|update public\.|insert into)\b/i);
});
test("merchant does not silently submit a stale request kind when its subscription state changes",()=>{
 assert.match(merchant,/const effectiveKind=choices\.includes\(kind\)\?kind:choices\[0\]/);
 assert.match(merchant,/p_business:businessId,p_kind:effectiveKind/);
 assert.match(merchant,/const confirmation=effectiveKind==="cancellation"/);
 assert.match(merchant,/value=\{effectiveKind\}/);
});
test("out-of-order merchant business reads cannot overwrite newer tenant data",()=>{
 assert.match(merchant,/const loadGeneration=useRef\(0\)/);
 assert.match(merchant,/const generation=\+\+loadGeneration\.current/);
 assert.match(merchant,/if\(generation!==loadGeneration\.current\)return/);
 assert.match(merchant,/loadGeneration\.current\+\+/);
});
test("merchant and platform review screens can refresh after a stale or failed read",()=>{
 assert.match(merchant,/aria-label="تحديث قائمة طلبات الاشتراك"/);
 assert.match(merchant,/disabled=\{busy\|\|loading\}/);
 assert.match(platform,/تحديث قائمة الطلبات/);
 assert.match(platform,/disabled=\{Boolean\(busy\)\|\|loading\}/);
});
