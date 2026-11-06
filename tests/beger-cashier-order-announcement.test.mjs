import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const cashier=readFileSync("app/dashboard/merchant-cashier.tsx","utf8");
const cashierCss=readFileSync("app/dashboard/merchant-cashier.css","utf8");
const staff=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const staffCss=readFileSync("app/dashboard/merchant-staff.css","utf8");
const guestWatcher=readFileSync("components/guest-order-watcher.tsx","utf8");

test("cashier announces newly ready orders only after first snapshot; polling does not reannounce unchanged ready orders",()=>{
 assert.match(cashier,/const seenReady=useRef<Set<string>\|null>\(null\)/);
 assert.match(cashier,/if\(seenReady\.current!==null\)/);
 assert.match(cashier,/o\.status==="ready"&&!seenReady\.current!\.has\(o\.id\)/);
 assert.match(cashier,/seenReady\.current=ready/);
 assert.match(cashier,/seenReady\.current=null;setAnnouncement\(""\)/);
 assert.match(cashier,/feedback\.signal\("ready",text\)/);
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
