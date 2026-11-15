import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const owner=readFileSync("app/dashboard/merchant-staff.tsx","utf8");
const employee=readFileSync("app/staff/page.tsx","utf8");
const join=readFileSync("app/staff/join/page.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-staff.css","utf8");

test("owner shares one same-origin staff join URL after a pending, not active, invitation",()=>{
 assert.match(owner,/g11_staff_invite/);
 assert.match(owner,/data\?\.status!=="pending"/);
 assert.match(owner,/new URL\("\/staff\/join",window\.location\.origin\)/);
 assert.match(owner,/navigator\.clipboard\.writeText\(link\)/);
 assert.match(owner,/نسخ رابط الموظف/);
 assert.match(owner,/لن تتفعّل الصلاحية قبل القبول/);
});
test("employee join page offers both existing-user login and new employee registration, not merchant creation by default",()=>{
 assert.match(join,/href="\/staff\/register"/);
 assert.match(join,/href="\/login"/);
 assert.match(join,/href="\/staff"/);
 assert.match(join,/نفس بريدك المدعو/);
 assert.match(join,/لا تحتاج إلى إنشاء متجر/);
 assert.match(join,/href="\/signup"/);
});
test("staff home points users to pending invitations instead of falsely claiming none exist",()=>{
 assert.match(employee,/دعواتك وصلاحياتك/);
 assert.match(employee,/افحص دعواتك أدناه واقبل الدعوة المرتبطة ببريدك/);
 assert.match(employee,/<StaffInvitations\/>/);
});
test("invite sharing has accessible touch-sized stacked actions on small screens",()=>{
 assert.match(owner,/beger-staff-share-actions/);
 assert.match(css,/\.beger-staff-share-actions/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:480px\)/);
});
