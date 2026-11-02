import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const menu=readFileSync("components/public-menu.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
const screens=readFileSync("components/guest-screen-switcher.tsx","utf8");
test("approved customer flow is welcome, four-across categories, compact product rows, detail popup",()=>{
 const intro=menu.indexOf("beger-welcome-screen");
 const tiles=menu.indexOf("beger-category-tiles");
 const rows=menu.indexOf("beger-menu-product-list");
 assert.ok(intro>=0&&tiles>intro&&rows>tiles,"must match mobile reference screen hierarchy");
 assert.match(css,/beger-category-tiles\{display:grid;grid-template-columns:repeat\(4/);
 assert.match(css,/beger-menu-product-list\{display:grid/);
 assert.match(details,/role="dialog" aria-modal="true"/);
 assert.match(details,/beger-product-popup-hero/);
 assert.match(menu,/imageUrl=\{i\.image_url\}/);
});
test("navigation and responsive reference layout work in AR/TR/EN",()=>{
 assert.match(menu,/aria-label="Languages"/);
 assert.match(menu,/lang==="ar"\?"rtl":"ltr"/);
 assert.match(menu,/<GuestScreenSwitcher lang=\{lang\}>/);
 assert.match(menu,/<GuestOpenMenu lang=\{lang\}/);
 assert.match(screens,/journey\?\.go\("menu"\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(screens,/className="beger-guest-bottom-nav"/);
 assert.match(css,/\.beger-guest-bottom-nav\{position:fixed/);
 assert.match(css,/\.beger-product-popup\{width:100%/);
 assert.match(css,/safe-area-inset-bottom/);
});
test("reference visual does not create fictional orders or ratings",()=>{
 assert.match(menu,/Delivery \(soon\)/);
 assert.match(details,/Preview only\. Ordering and payment are not active yet/);
 assert.doesNotMatch(menu+details,/submitOrder|fakeRating|paymentIntent/);
});

test("approved mobile reference keeps meaningful hierarchy without tiny vertical text",()=>{
 assert.match(css,/\.beger-welcome-photo\{height:245px;min-height:245px\}/);
 assert.match(css,/\.beger-category-tiles a strong\{font-size:clamp\(9px,2\.7vw,12px\)/);
 assert.match(css,/\.beger-menu-product-list \.beger-guest-product-photo\{height:74px!important;width:74px!important/);
 assert.match(css,/\.beger-guest-bottom-nav\{min-height:64px/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(details,/className="beger-product-name"/);
 assert.match(details,/\{title\(details\)\}/);
 assert.match(details,/className="beger-product-base-price"/);
 assert.match(details,/className="beger-modifier-card"/);
 assert.match(css,/\.beger-product-add-button\{position:sticky/);
});

test("reference photo-led modal keeps real catalog pricing and no fabricated star score",()=>{
 assert.match(details,/formatPrice\(Number\(details\.price_minor\),country,lang\)/);
 assert.doesNotMatch(details,/1,264 Reviews|fakeRating|4\.8\s*★/);
 assert.match(details,/Preview only\. Ordering and payment are not active yet/);
});

test("real welcome and menu are separate phone screens with functional navigation",()=>{
 assert.match(screens,/useState<Stage>\("welcome"\)/);
 assert.match(screens,/go\("welcome"\)/);
 assert.match(screens,/go\("menu"\)/);
 assert.match(screens,/basket\?\.open\(\)/);
 assert.match(screens,/aria-disabled="true"/);
 assert.match(css,/data-stage="welcome"\] \.beger-menu-intro/);
 assert.match(css,/data-stage="menu"\] \.beger-welcome-screen/);
 assert.match(menu,/className="beger-menu-section"/);
 assert.doesNotMatch(screens,/checkout|submitOrder|paymentIntent/);
});
