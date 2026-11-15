import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const poster=readFileSync("app/demo/salon/share/salon-share-kit.tsx","utf8");
const svg=readFileSync("public/demo/beger-salon-customer-qr.svg","utf8");
const page=readFileSync("app/demo/salon/share/page.tsx","utf8");
const landing=readFileSync("app/demo/salon/page.tsx","utf8");
const role=readFileSync("app/demo/salon/salon-role-demo.tsx","utf8");
test("G43 self-hosted real QR points to a fixed public demo booking route",()=>{
 assert.match(svg,/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/viewBox="0 0 49 49"/);
 assert.match(svg,/<path fill="#172e25" d="M/);
 assert.ok(svg.length>4000);
 assert.match(poster,/\/demo\/beger-salon-customer-qr\.svg/);
 assert.match(poster,/\/demo\/salon\/customer/);
 assert.doesNotMatch(poster,/api\.qrserver|chart\.googleapis|qrcode\.monkey/);
});
test("G43 share kit offers printed poster and customer social links with attribution hints",()=>{
 assert.match(page,/SalonShareKit/);
 assert.match(poster,/window\.print\(\)/);
 assert.match(poster,/navigator\.share/);
 assert.match(poster,/navigator\.clipboard\.writeText/);
 assert.match(poster,/https:\/\/wa\.me\/\?text=/);
 assert.match(poster,/sourceLink\("instagram"\)/);
 assert.match(poster,/sourceLink\("google"\)/);
 assert.match(landing,/\/demo\/salon\/share/);
 assert.match(role,/\/demo\/salon\/share/);
});
test("G43 public booking QR never reuses appointment check-in token",()=>{
 assert.doesNotMatch(poster,/checkin\?token=/);
 assert.match(poster,/ليس رمز إثبات وصول/);
 assert.match(poster,/حجوزات مشتركة بين الهواتف/);
 assert.match(page,/index:false/);
});
