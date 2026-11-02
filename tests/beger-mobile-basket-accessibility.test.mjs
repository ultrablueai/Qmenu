import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const basket=readFileSync("components/guest-cart.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
test("cart is a local scoped UI and delegates active table order to the guarded submit component",()=>{
 assert.match(basket,/notice:tableToken\?/);
 assert.match(basket,/<GuestOrderSubmission lang=\{lang\}/);
 assert.doesNotMatch(basket,/\.from\(|\.rpc\(|submitOrder|paymentIntent|checkout|localStorage/);
 assert.match(basket,/Math\.min\(99/);
 assert.match(basket,/setItems\(prev=>prev\.filter\(x=>x\.key!==item\.key\)\)/);
});
test("basket dialog supports keyboard Escape, focus and close controls",()=>{
 assert.match(basket,/aria-modal="true"/);
 assert.match(basket,/closeRef\.current\?\.focus\(\)/);
 assert.match(basket,/event\.key==="Escape"/);
 assert.match(basket,/originalOverflow=document\.body\.style\.overflow/);
 assert.match(basket,/ref=\{openerRef\}/);
 assert.match(basket,/ref=\{closeRef\}/);
});
test("all quantity controls are localized and mobile sheet has safe-area spacing",()=>{
 assert.match(basket,/quantity:en\?/);
 assert.match(basket,/remove:en\?/);
 assert.match(basket,/aria-label=\{labels\.quantity/);
 assert.match(css,/\.beger-basket-sheet/);
 assert.match(css,/95dvh/);
 assert.match(css,/env\(safe-area-inset-bottom/);
});
test("required product choices stay enforced before a basket preview item",()=>{
 assert.match(details,/if\(!details\|\|!valid\|\|!cart\)return/);
 assert.match(details,/disabled=\{!valid\}/);
});
