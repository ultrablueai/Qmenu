import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const details=readFileSync("components/product-details.tsx","utf8");
const reviews=readFileSync("components/guest-rating-preview.tsx","utf8");
test("required additions precede optional groups and selections have capacity limits",()=>{
 assert.match(details,/groups\.slice\(\)\.sort\(\(a,b\)=>Number\(b\.min_select>0\)-Number\(a\.min_select>0\)\)/);
 assert.match(details,/g\.max_select/);
 assert.match(details,/current\.length<g\.max_select/);
 assert.match(details,/!details\|\|!valid\|\|!cart/);
});
test("selected additions and removed ingredients are included in basket key",()=>{
 assert.match(details,/selectedIds/);
 assert.match(details,/removed\.slice\(\)\.sort\(\)/);
 assert.match(details,/unitMinor:Number\(details\.price_minor\)\+extra/);
 assert.match(details,/role="status"/);
});
test("reviews are clearly unverified and never persisted",()=>{
 assert.match(reviews,/لا توجد تقييمات موثقة بعد/);
 assert.match(reviews,/لم يُنشر تقييمك/);
 assert.match(reviews,/aria-pressed=\{rating===n\}/);
 assert.doesNotMatch(reviews,/\.insert\(|fetch\(|localStorage|\.upsert\(/);
});
