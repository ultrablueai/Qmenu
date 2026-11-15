import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {readFileSync} from "node:fs";
const transpile=path=>ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
// These executable tests are derived from actual source; pricing has no network or payment side effects.
const sectorJS=transpile("lib/beger-sector-catalog.ts");
const pricingJS=transpile("lib/beger-subscription-pricing.ts").replace('from "./beger-sector-catalog"','from "data:text/javascript;base64,'+Buffer.from(sectorJS).toString("base64")+'"');
const pricing=await import("data:text/javascript;base64,"+Buffer.from(pricingJS).toString("base64"));
const priceBook={country:"TR",currency:"TRY",revision:"test-only-v1",published:true,period:"monthly",baseMinor:29900,perBranchMinor:10000,featureMonthlyMinor:{qr_catalog:0,table_orders:40000,kitchen_board:10000,digital_pager:10000}};
test("unpublished or absent merchant subscription price books cannot invent prices",()=>{
 const request={sector:"cafe",country:"TR",features:["qr_catalog","digital_pager"],branches:1};
 assert.equal(pricing.calculateSubscriptionPreview(request).amountMinor,null);
 assert.equal(pricing.calculateSubscriptionPreview({...request,book:{...priceBook,published:false}}).amountMinor,null);
 assert.equal(pricing.calculateSubscriptionPreview({...request,book:{...priceBook,country:"SY"}}).amountMinor,null);
});
test("merchant selected features are correctly summed without taxing restaurant order totals",()=>{
 const quote=pricing.calculateSubscriptionPreview({sector:"cafe",country:"TR",features:["qr_catalog","table_orders","digital_pager"],branches:2,book:priceBook});
 assert.equal(quote.amountMinor,89900);
 assert.equal(quote.currency,"TRY");
 assert.equal(quote.requiresQuote,false);
 assert.deepEqual(quote.features,["qr_catalog","table_orders","digital_pager"]);
});
test("unavailable or unpriced features can never silently become a paid entitlement",()=>{
 const quote=pricing.calculateSubscriptionPreview({sector:"cafe",country:"TR",features:["scheduled_pickup"],branches:1,book:priceBook});
 assert.equal(quote.requiresQuote,true);
 assert.equal(quote.amountMinor,null);
 assert.deepEqual(quote.missingPrices,["scheduled_pickup"]);
 const barber=pricing.calculateSubscriptionPreview({sector:"barber",country:"TR",features:["kitchen_board","appointments"],branches:1,book:priceBook});
 assert.deepEqual(barber.features,["appointments"]);
 assert.equal(barber.amountMinor,null);
});
test("annual discount and branch charges are explicit and validated",()=>{
 const quote=pricing.calculateSubscriptionPreview({sector:"cafe",country:"TR",features:["qr_catalog"],branches:3,book:{...priceBook,period:"yearly",yearlyDiscountBasisPoints:1000}});
 assert.equal(quote.amountMinor,538920);
 assert.throws(()=>pricing.calculateSubscriptionPreview({sector:"cafe",country:"TR",features:[],branches:0,book:priceBook}));
 assert.throws(()=>pricing.calculateSubscriptionPreview({sector:"cafe",country:"TR",features:[],branches:1,book:{...priceBook,period:"yearly",yearlyDiscountBasisPoints:12000}}));
});
