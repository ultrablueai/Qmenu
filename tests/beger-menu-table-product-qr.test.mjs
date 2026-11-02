import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const merchant=read("app/dashboard/headquarters-catalog.tsx");
const tables=read("app/dashboard/merchant-table-qr.tsx");
const qr=read("lib/qr/qr-svg.tsx");
const scanner=read("components/guest-qr-scanner.tsx");
const guest=read("components/guest-screen-switcher.tsx");
const product=read("components/product-details.tsx");
const central=read("app/dashboard/central-catalog.tsx");
test("shop QR is locally rendered, not hosted by flaky external image service",()=>{
 assert.match(merchant,/<QrSvg value=\{origin\+guestPath\}/);
 assert.doesNotMatch(merchant,/api\.qrserver\.com/);
 assert.match(qr,/import QRCode from "\.\/vendor"/);
 assert.match(qr,/role="img"/);
});
test("merchant table QR uses real dining_tables RLS and token rotation",()=>{
 assert.match(tables,/from\("dining_tables"\)/);
 assert.match(tables,/\.eq\("business_id",businessId\)\.eq\("branch_id",branchId\)/);
 assert.match(tables,/qr_token:crypto\.randomUUID\(\)/);
 assert.match(tables,/update\(\{active:!table\.active\}\)/);
 assert.match(tables,/\/t\/"/);
 assert.match(merchant,/MerchantTableQr/);
});
test("scanning is opt-in, camera stops, and arbitrary external QR redirects are forbidden",()=>{
 assert.match(scanner,/getUserMedia/);
 assert.match(scanner,/new Detector\(\{formats:\["qr_code"\]\}\)/);
 assert.match(scanner,/url\.origin!==window\.location\.origin/);
 assert.match(scanner,/validRoute\.test\(url\.pathname\)/);
 assert.match(scanner,/track|Tracks\(\)\.forEach/);
 assert.match(scanner,/type="text" inputMode="url"/);
 assert.match(guest,/<GuestQrScanner lang=\{lang\}/);
});
test("product QR points to published branch and opens product without bypassing permissions",()=>{
 assert.match(central,/publication\?\.active&&publication\.available&&prod\.active/);
 assert.match(central,/<MenuProductQr/);
 assert.match(product,/new URLSearchParams\(window\.location\.search\)\.get\("product"\)/);
 assert.match(product,/requested===productId/);
 const productQr=read("components/menu-product-qr.tsx");
 assert.match(productQr,/encodeURIComponent\(productId\)/);
});
