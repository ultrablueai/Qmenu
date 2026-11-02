import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const guest=readFileSync("components/public-menu.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");
const selector=readFileSync("app/dashboard/merchant-appearance.tsx","utf8");
const hq=readFileSync("app/dashboard/dashboard.module.css","utf8");
const home=readFileSync("app/page.tsx","utf8");
test("approved warm, responsive cafe visual identity is implemented in customer UI",()=>{
 assert.match(guest,/import "\.\/public-menu\.css"/);
 assert.match(guest,/beger-guest-hero/);
 assert.match(guest,/beger-category-tiles/);
 assert.match(guest,/beger-welcome-screen/);
 assert.match(guest,/beger-menu-product-list/);
 assert.match(guest,/beger-guest-bottom-nav/);
 assert.match(guest,/beger-guest-product/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(guest,/#FAF6EF/);
 assert.doesNotMatch(guest,/#141310/);
});
test("HQ and all three existing theme IDs use approved ivory, olive, coffee identity",()=>{
 for(const id of ["luxe_dark","clean_light","bold_commerce"])assert.ok(selector.includes('id:"'+id+'"'));
 for(const label of ["Olive Premium","Soft Light","Warm Editorial"])assert.ok(selector.includes(label));
 assert.match(hq,/Approved Beger HQ design/);
 assert.match(home,/#FAF7F0/);
});
test("visual redesign must not simulate operational orders or unverified ratings",()=>{
 const cart=readFileSync("components/guest-cart.tsx","utf8");
 const reviews=readFileSync("components/guest-rating-preview.tsx","utf8");
 assert.match(cart,/Preview only\. No order has been placed/);
 assert.match(reviews,/No verified reviews yet/);
 assert.doesNotMatch(guest+cart+reviews,/submitOrder|paymentIntent|fakeRating/);
});
