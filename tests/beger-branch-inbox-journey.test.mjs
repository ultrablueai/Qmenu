import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const branch=read("app/dashboard/branches/[branchId]/page.tsx");
const orderBoard=read("app/dashboard/merchant-order-board.tsx");
const cart=read("components/guest-cart.tsx");
const sql=read("supabase/migrations/20261102195000_g3_pilot_table_orders.sql");

test("verified branch page mounts actual merchant inbox and table codes, not coming-soon placeholders",()=>{
 assert.match(branch,/const canManageOrders = role === "owner" \|\| role === "manager"/);
 assert.match(branch,/<MerchantOrderBoard businessId=\{business\.id\} branchId=\{branch\.id\} branchName=\{branch\.name\}/);
 assert.match(branch,/<MerchantTableQr businessId=\{business\.id\} branchId=\{branch\.id\} branchName=\{branch\.name\}/);
 assert.match(branch,/href="#beger-merchant-orders"/);
 assert.match(branch,/href="#beger-table-qr-title"/);
 assert.doesNotMatch(branch,/الطلبات والانتظار ستُربط بهذا الفرع عند تفعيل وحداتها/);
});
test("branch keeps tenant security and role checks before rendering order controls",()=>{
 assert.match(branch,/auth\.getUser\(\)/);
 assert.match(branch,/\.eq\("user_id", user\.id\)/);
 assert.match(branch,/\.in\("business_id", businessIds\)/);
 assert.match(branch,/if \(!branch\) notFound\(\)/);
 assert.match(branch,/\{canManageOrders \? <>/);
 assert.match(sql,/g3_branch_orders\(p_branch uuid\)/);
 assert.match(sql,/m\.business_id=v_business and m\.user_id=auth\.uid\(\)/);
});
test("branch kitchen tickets show major currency rather than raw minor units",()=>{
 assert.match(orderBoard,/factor=currency==="TRY"\?100:1/);
 assert.match(orderBoard,/formatOrderTotal\(o\.totalMinor,o\.currency\)/);
 assert.doesNotMatch(orderBoard,/o\.totalMinor\.toLocaleString\("ar"\)/);
 assert.match(orderBoard,/تحديث الطلبات الآن/);
});
test("customer cart distinguishes shop browsing and real table order with truthful status",()=>{
 assert.match(cart,/preview:tableToken\?/);
 assert.match(cart,/notice:tableToken\?/);
 assert.match(cart,/طلبك لن يصل للمطعم إلا بعد الضغط على/);
 assert.match(cart,/امسح QR الطاولة لإرسال طلب/);
});

test("branch inbox and table QR appear above low-priority branch metadata on mobile",()=>{
 const nav=branch.indexOf('aria-label="تنقل تشغيل الفرع"');
 const inbox=branch.indexOf('<MerchantOrderBoard businessId=');
 const meta=branch.indexOf('<div className={styles.twoCols}>');
 assert.ok(nav>=0 && inbox>nav && meta>inbox,"Merchant should see incoming orders before informational cards");
 assert.match(branch,/branchOperationsIntro/);
 assert.doesNotMatch(branch,/className=\{styles\.hero\} style=\{\{ marginTop:24 \}\}/);
});

test("merchant workflow remains accessible from authenticated branch, never from guest menu",()=>{
 assert.match(branch,/const canManageOrders = role === "owner" \|\| role === "manager"/);
 assert.match(branch,/g3|MerchantOrderBoard/);
 assert.doesNotMatch(cart,/g3_transition_order|g3_branch_orders/);
 assert.match(orderBoard,/g3_transition_order/);
});
