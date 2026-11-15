import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const control=readFileSync("app/demo-control/page.tsx","utf8");
const dash=readFileSync("app/dashboard/page.tsx","utf8");
const home=readFileSync("app/page.tsx","utf8");
const ops=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
test("demo control is restricted to verified owner membership of existing seeded demo business",()=>{
 assert.match(control,/await db\.auth\.getUser\(\)/);
 assert.match(control,/if\(authError\|\|!user\)redirect\("\/login"\)/);
 assert.match(control,/\.eq\("business_id",DEMO_BUSINESS\)\.eq\("user_id",user\.id\)\.maybeSingle\(\)/);
 assert.match(control,/membership\?\.role!=="owner"/);
 assert.match(control,/\.eq\("id",DEMO_BRANCH\)\.eq\("business_id",DEMO_BUSINESS\)/);
 assert.match(control,/const isAdmin=!platformError/);
 assert.match(control,/visibleTiles=tiles\.filter\(t=>isAdmin\|\|t\.href!=="\/admin"\)/);
 assert.match(control,/robots:\{index:false,follow:false\}/);
});
test("demo shortcuts open existing real merchant workflows, not synthetic role grants",()=>{
 for(const anchor of ["merchant-orders","merchant-pager","merchant-reports","catalog-management","qr-management","customer-appearance","merchant-reviews","merchant-loyalty","merchant-staff"]){
  assert.match(control,new RegExp(anchor));
 }
 for(const path of ["/staff/cashier?branch=","/staff/kitchen?branch=","/admin"]){
  assert.ok(control.includes(path),path);
 }
 assert.match(control,/\/b\/"\+DEMO_BRANCH\+"\?lang=ar&service=takeaway"/);
 assert.match(control,/DEMO_BUSINESS="b0000000-2026-4000-8000-000000000001"/);
 assert.match(control,/DEMO_BRANCH="b0000000-2026-4000-8000-000000000002"/);
 assert.doesNotMatch(control,/service_role|auth\.admin|insert into|update public\./);
});
test("demo shortcuts preserve true business scope and operations fragment routing",()=>{
 assert.match(dash,/currentRole==="owner"\?<Link className=\{styles\.navItem\} href="\/demo-control"/);
 assert.match(ops,/h==="#merchant-staff"/);
 assert.match(ops,/h==="#qr-management"/);
 assert.match(ops,/h==="#merchant-pager"/);
 assert.match(ops,/h==="#catalog-management"/);
 assert.match(home,/مركز اختبار المتجر للمالك/);
 assert.match(home,/يمكنك تجربة إرسال الطلبات وتشغيل الكاشير والمطبخ والبيجر/);
});
