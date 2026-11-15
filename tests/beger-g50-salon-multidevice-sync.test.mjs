import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("app/salon/workspace/salon-verified-workspace.tsx","utf8");
const server=readFileSync("app/salon/workspace/page.tsx","utf8");
const sql=readFileSync("supabase/migrations/20261114000200_g47_salon_staff_workspace_approval.sql","utf8");
test("G50 sync polls server authorized RPC only, never exposes a protected salon table",()=>{
 assert.match(ui,/browserSupabase\(\)\.rpc\("beger_g47_salon_workspace"/);
 assert.match(ui,/p_business:businessId/);
 assert.match(ui,/window\.setInterval\(run,15000\)/);
 assert.match(ui,/document\.visibilityState==="visible"/);
 assert.match(ui,/window\.addEventListener\("focus",run\)/);
 assert.match(ui,/window\.clearInterval\(timer\)/);
 assert.doesNotMatch(ui,/\.from\("salon_bookings"\)/);
 assert.doesNotMatch(ui,/\.channel\(/);
});
test("G50 sync fails closed on stale auth or cross-scope changes",()=>{
 assert.match(ui,/data\.business_id!==businessId/);
 assert.match(ui,/data\.role!==initial\.role/);
 assert.match(ui,/data\.scope!==initial\.scope/);
 assert.match(ui,/data\.billing_enabled!==false/);
 assert.match(ui,/Array\.isArray\(data\.bookings\)/);
 assert.match(ui,/Array\.isArray\(data\.staff\)/);
 assert.match(ui,/setSyncState\("offline"\)/);
 assert.match(sql,/sl\.staff_id=any\(v_staff_ids\)/);
 assert.match(server,/supabase\.auth\.getUser\(\)/);
});
test("G50 filters metrics and booking lists from freshly synchronized scope only",()=>{
 assert.match(ui,/const \[snapshot,setSnapshot\]=useState<SalonWorkspaceData>\(initial\)/);
 assert.match(ui,/const filtered=snapshot\.bookings\.filter/);
 assert.match(ui,/snapshot\.summary\.pending_bookings/);
 assert.match(ui,/snapshot\.staff\.map/);
 assert.match(ui,/viewRef\.current=next;setSnapshot\(next\)/);
 assert.match(ui,/new Map\(viewRef\.current\.bookings\.map/);
});
test("G50 push is opt-in foreground browser-only, not misleading background alerts",()=>{
 assert.match(ui,/Notification\.requestPermission\(\)/);
 assert.match(ui,/Notification\.permission==="granted"&&document\.visibilityState==="visible"/);
 assert.match(ui,/new Notification\("Beger Salon/);
 assert.match(ui,/إشعارات الخلفية وQR للحجز العام لم يكتمل/);
 assert.doesNotMatch(ui,/pushManager\.subscribe|Notification\.permission="granted"/);
});
