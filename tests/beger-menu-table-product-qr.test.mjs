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

test("shop, table and product QR can be saved as independent printable SVGs",()=>{
 const exporter=read("components/qr-export.tsx");
 const productQr=read("components/menu-product-qr.tsx");
 assert.match(exporter,/new XMLSerializer\(\)\.serializeToString\(copy\)/);
 assert.match(exporter,/image\/svg\+xml/);
 assert.match(exporter,/anchor\.download=fileName/);
 assert.match(merchant,/<QrExport targetId=\{"beger-shop-code-"/);
 assert.match(tables,/<QrExport targetId=\{"beger-table-code-"/);
 assert.match(productQr,/<QrExport targetId=\{"beger-product-code-"/);
 assert.doesNotMatch(merchant,/window\.print\(\)|api\.qrserver\.com/);
});
test("staging scan accepts only same origin or Beger owned preview deployments",()=>{
 assert.match(scanner,/sameProjectPreview=preview\.test\(url\.hostname\)\&\&preview\.test\(window\.location\.hostname\)/);
 assert.match(scanner,/url\.origin!==window\.location\.origin\&\&!sameProjectPreview/);
 assert.match(scanner,/url\.pathname\+\(p\?/);
 assert.doesNotMatch(scanner,/window\.location\.assign\(value\)/);
});

test("QR camera supports Safari and saved photos without network upload",()=>{
 const license=read("lib/qr/decoder/LICENSE-APACHE-2.0.txt");
 const decoder=read("lib/qr/decoder/jsQR.js");
 assert.match(license,/Apache License/);
 assert.ok(decoder.length>100000);
 assert.match(scanner,/import\("\.\.\/lib\/qr\/decoder\/jsQR"\)/);
 assert.match(scanner,/context\.getImageData\(0,0,width,height\)/);
 assert.match(scanner,/scanPhoto\(file:File\|null\)/);
 assert.match(scanner,/type="file" accept="image\/\*"/);
 assert.match(scanner,/!window\.isSecureContext\|\|!navigator\.mediaDevices\?\.getUserMedia/);
 assert.doesNotMatch(scanner,/fetch\(|axios|api\.qrserver/);
});

test("same canonical product published to two branches exports distinct QR codes",()=>{
 const source=read("components/menu-product-qr.tsx");
 assert.match(source,/id=\{"beger-product-code-"\+branchId\+"-"\+productId\}/);
 assert.match(source,/fileName=\{"beger-product-"\+branchId\+"-"\+productId\}/);
});

test("camera dialog mounts its video before requesting permission and explains blocked access",()=>{
 assert.match(scanner,/flushSync\(\(\)=>\{setOpen\(true\)/);
 assert.match(scanner,/video\.srcObject=stream/);
 assert.match(scanner,/await video\.play\(\)/);
 assert.match(scanner,/style=\{\{display:active\?"block":"none"\}\}/);
 assert.match(scanner,/NotAllowedError/);
 assert.match(scanner,/NotFoundError/);
 assert.match(scanner,/requestId!==requestRef\.current/);
 assert.match(scanner,/setError\(strings\.unsupported\)/);
 assert.match(scanner,/beger-scanner-browser-link/);
});
