import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
const stationAlerts=readFileSync("lib/beger-station-alerts.ts","utf8");
const cashierCss=readFileSync("app/dashboard/merchant-cashier.css","utf8");
const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const staffCss=readFileSync("app/dashboard/merchant-staff.css","utf8");
const guestWatcher=readFileSync("components/guest-order-watcher.tsx","utf8");

test("cashier alerts on new pending and ready status, not unchanged snapshots or historical first load",()=>{
 assert.match(cashier,/useStationAlerts\("cashier",branchId,feedback\.signal\)/);
 assert.match(cashier,/stationAlerts\.observe\(fresh\)/);
 assert.match(stationAlerts,/cashier:\{pending:"طلب جديد ينتظر قبول الكاشير",ready:"طلب جاهز للاستلام"\}/);
 assert.match(stationAlerts,/if\(previous!==null&&label&&prior!==order\.status\)/);
 assert.match(stationAlerts,/if\(!previous\.alerts\.some\(a=>a\.key===key\)\)/);
 assert.match(cashier,/document\.addEventListener\("visibilitychange",onVisible\)/);
 assert.match(cashier,/<StationAlertBell/);
});

test("cashier ready ticket can be called again without mutating the order or changing payment",()=>{
 assert.match(cashier,/function announce\(order:Order\)/);
 assert.match(cashier,/order\.reference\+" جاهز للاستلام"/);
 assert.match(cashier,/onClick=\{\(\)=>announce\(order\)\}>🔔 إعلان رقم الطلب/);
 assert.match(cashier,/role="status" aria-live="polite"/);
 assert.match(cashier,/BegerFeedbackControls settings=\{feedback.settings\}/);
 assert.doesNotMatch(cashier.slice(cashier.indexOf("function announce(order:Order)"),cashier.indexOf("const active=orders.filter")),/\.rpc\(|payment_status|paymentStatus|g10_cashier_mark_collected/);
 assert.match(cashierCss,/\.beger-cashier-ready-actions/);
 assert.match(cashierCss,/@media\(max-width:440px\)/);
});

test("staff workspace links to existing scoped stations without granting new roles",()=>{
 for(const station of ["cashier","kitchen","pager"]){
  assert.match(staff,new RegExp('href=\\{"/staff/'+station+'\\?branch="\\+encodeURIComponent\\(branchId\\)\\}'));
 }
 assert.match(staff,/كل محطة تتطلب حساباً مسجلاً وصلاحية مخصصة للفرع/);
 assert.match(staffCss,/\.beger-staff-stations/);
 assert.match(staffCss,/@media\(max-width:720px\)/);
});

test("order-ready feedback for guests is already owned by order watcher; independent Pager stays separate",()=>{
 assert.match(guestWatcher,/ready:"ready"/);
 assert.match(guestWatcher,/feedback\.signal\(kind,display\)/);
 assert.doesNotMatch(cashier,/g6_pager_issue|g6_pager_transition|g6_pager_display_status/);
});
