import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const menu=readFileSync("components/public-menu.tsx","utf8");
const css=readFileSync("components/public-menu.css","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
const screens=readFileSync("components/guest-screen-switcher.tsx","utf8");
test("approved customer flow is welcome, four-across categories, compact product rows, detail popup",()=>{
 const intro=menu.indexOf("beger-welcome-screen");
 const tiles=menu.indexOf("<GuestCatalogExplorer lang=");
 const rows=menu.indexOf("beger-menu-product-list");
 assert.ok(intro>=0&&tiles>intro&&rows>tiles,"must match mobile reference screen hierarchy");
 assert.match(css,/\.beger-category-filter\[aria-pressed="true"\]/);
 assert.match(css,/beger-menu-product-list\{display:grid/);
 assert.match(details,/role="dialog" aria-modal="true"/);
 assert.match(details,/beger-product-popup-hero/);
 assert.match(menu,/imageUrl=\{i\.image_url\}/);
});
test("navigation and responsive reference layout work in AR/TR/EN",()=>{
 assert.match(menu,/GuestLanguageSwitcher lang=\{lang\}/);
 assert.match(menu,/lang==="ar"\?"rtl":"ltr"/);
 assert.match(menu,/<GuestScreenSwitcher lang=\{lang\} initialStage=\{tableToken\?"menu":"welcome"\}>/);
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
 assert.match(details,/tableOrdering\?/);
 assert.match(details,/Scan your table QR to submit an order/);
 assert.doesNotMatch(menu+details,/submitOrder|fakeRating|paymentIntent/);
});

test("approved mobile reference keeps meaningful hierarchy without tiny vertical text",()=>{
 assert.match(css,/\.beger-welcome-photo\{height:345px;min-height:345px\}/);
 assert.match(css,/\.beger-category-tiles a strong\{font-size:clamp\(9px,2\.7vw,12px\)/);
 assert.match(css,/\.beger-menu-product-list \.beger-guest-product-photo\{height:74px!important;width:74px!important/);
 assert.match(css,/\.beger-guest-bottom-nav\{position:fixed/);
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
 assert.match(details,/tableOrdering\?/);
 assert.match(details,/Scan your table QR to submit an order/);
});

test("real welcome and menu are separate phone screens with functional navigation",()=>{
 assert.match(screens,/useState<Stage>\(initialStage\)/);
 assert.match(screens,/go\("welcome"\)/);
 assert.match(screens,/go\("menu"\)/);
 assert.match(screens,/basket\?\.open\(\)/);
 assert.match(screens,/journey\.go\("rewards"\)/);
 assert.match(css,/data-stage="welcome"\] \.beger-menu-intro/);
 assert.match(css,/data-stage="menu"\] \.beger-welcome-screen/);
 assert.match(menu,/className="beger-menu-section" data-category-id=\{c\.id\}/);
 assert.doesNotMatch(screens,/checkout|submitOrder|paymentIntent/);
});

test("customer navigation is functional without inventing loyalty features",()=>{
 assert.match(screens,/useGuestCart\(\)/);
 assert.match(screens,/basket\?\.count/);
 assert.match(screens,/\["Home","Menu","Basket","Rewards"\]/);
 assert.doesNotMatch(screens,/1,250 Points|ratingAverage|orderCompleted/);
});

test("reference layout uses actual customer UI not presentation images",()=>{
 const reward=readFileSync("components/guest-rewards-preview.tsx","utf8");
 const search=readFileSync("components/guest-menu-search.tsx","utf8");
 const favorite=readFileSync("components/guest-favorite.tsx","utf8");
 const cart=readFileSync("components/guest-cart.tsx","utf8");
 assert.match(menu,/GuestRewardsPreview lang=\{lang\}/);
 assert.match(menu,/<GuestCatalogExplorer lang=\{lang\} initialCategoryId=\{initialCategoryId\}/);
 assert.match(menu,/GuestFavorite lang=\{lang\}/);
 assert.match(search,/type="search"/);
 assert.match(search,/card\.hidden=!match/);
 assert.match(favorite,/aria-pressed=\{saved\}/);
 assert.match(reward,/Loyalty is not active yet/);
 assert.match(cart,/className="beger-order-item"/);
 assert.match(cart,/formatPrice\(subtotal,country,lang\)/);
 assert.match(cart,/formatPrice\(additions,country,lang\)/);
});

test("category choice filters real products in place instead of scrolling to next section",()=>{
 const explorer=readFileSync("components/guest-catalog-explorer.tsx","utf8");
 assert.match(menu,/categories\.map\(c=>\(\{id:c\.id,name:localizedText\(c,lang\)/);
 assert.match(explorer,/aria-pressed=\{selected===category\.id\}/);
 assert.match(explorer,/section\.dataset\.categoryId===selected/);
 assert.match(explorer,/section\.hidden=!inCategory\|\|sectionProducts===0/);
 assert.match(explorer,/product\.hidden=!inCategory\|\|!matched/);
 assert.doesNotMatch(menu,/href=\{\x60#category-/);
 assert.match(css,/\.beger-category-filter\[aria-pressed="true"\]/);
});
test("language changes keep customer view and shopping context",()=>{
 const screens=readFileSync("components/guest-screen-switcher.tsx","utf8");
 assert.match(screens,/params\.set\("view","menu"\)/);
 assert.match(screens,/params\.get\("view"\)==="menu"/);
 assert.match(screens,/new URLSearchParams\(search\)/);
});

test("menu starts with one product category, not a giant all-products list",()=>{
 const explorer=readFileSync("components/guest-catalog-explorer.tsx","utf8");
 assert.match(explorer,/useState\(initialCategoryId\?\?categories\.find\(c=>c\.count>0\)\?\.id\?\?"all"\)/);
 assert.match(explorer,/aria-pressed=\{selected===category\.id\}/);
 assert.match(explorer,/section\.hidden=!inCategory\|\|sectionProducts===0/);
});
