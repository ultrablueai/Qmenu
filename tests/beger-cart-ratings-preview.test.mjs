import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const cart=readFileSync("components/guest-cart.tsx","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
const rating=readFileSync("components/guest-rating-preview.tsx","utf8");
const menu=readFileSync("components/public-menu.tsx","utf8");
test("guest menu mounts a branch-local preview cart and non-fabricated ratings",()=>{
 assert.match(menu,/<GuestCart key=\{branch\.branch_id\}/);
 assert.match(menu,/<GuestRatingPreview lang=\{lang\}/);
 assert.match(rating,/لا توجد تقييمات موثقة بعد/);
 assert.match(rating,/لم يُنشر تقييمك/);
});
test("basket stays in browser memory, cannot transmit checkout or ratings",()=>{
 assert.match(cart,/useState<CartItem\[\]>/);
 assert.match(cart,/quantity:Math\.min\(99/);
 assert.match(cart,/لم يتم إرسال أي طلب/);
 assert.doesNotMatch(cart+rating,/fetch\(|\.insert\(|\.upsert\(|localStorage|sessionStorage|submitOrder|checkout|paymentIntent/);
});
test("product customization respects required group limits before basket",()=>{
 assert.match(details,/const valid=details\?\.groups\.every/);
 assert.match(details,/g\.min_select/);
 assert.match(details,/g\.max_select/);
 assert.match(details,/if\(!details\|\|!valid\|\|!cart\)return/);
 assert.match(details,/selectedIds/);
 assert.match(details,/removed\.slice\(\)\.sort\(\)/);
 assert.match(details,/unitMinor:Number\(details\.price_minor\)\+extra/);
});

// Preview release: basket, modifiers, ratings and QR are non-production demonstration features.
