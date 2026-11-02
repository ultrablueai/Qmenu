import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const cart=readFileSync("components/guest-cart.tsx","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
const rating=readFileSync("components/guest-rating-preview.tsx","utf8");
const menu=readFileSync("components/public-menu.tsx","utf8");
test("guest menu mounts a branch-local preview cart and non-fabricated ratings",()=>{
 assert.match(menu,/<GuestCart key=\{branch\.branch_id\}/);
 assert.match(details,/<GuestRatingPreview lang=\{lang\}/);
 assert.match(rating,/لا توجد تقييمات موثقة بعد/);
 assert.match(rating,/لم يُنشر تقييمك/);
});
test("basket stays scoped to the branch and table and cannot initiate payment or ratings",()=>{
 assert.match(cart,/useState<CartItem\[\]>/);
 assert.match(cart,/quantity:Math\.min\(99/);
 assert.match(cart,/لم يتم إرسال أي طلب/);
 assert.match(cart,/sessionStorage\.setItem\(storageKey/);
 assert.match(cart,/<GuestOrderSubmission/);
 assert.doesNotMatch(cart+rating,/paymentIntent|fakeRating|chargeCard|service_role/);
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

// G3 pilot ordering is server-priced and branch-gated, while ratings and payment remain unavailable.

test("compact menu rows open full customization by tapping rather than stacked buttons",()=>{
 const css=readFileSync("components/public-menu.css","utf8");
 assert.match(details,/className="beger-product-open-trigger"/);
 assert.match(css,/\.beger-product-open-trigger\{/);
 assert.match(css,/\.beger-product-action-mount\{height:0/);
 assert.match(css,/\.beger-favorite-button\{position:relative;z-index:3/);
 assert.doesNotMatch(menu,/<GuestRatingPreview lang=\{lang\}/);
});
