import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const detail=read("components/product-details.tsx");
const cart=read("components/guest-cart.tsx");
const mods=read("app/dashboard/product-options-manager.tsx");
const hq=read("app/dashboard/hq-reference-overview.tsx");
test("guest chooses product quantity before preview basket, and cart honors it",()=>{
 assert.match(detail,/\[quantity,setQuantity\]=useState\(1\)/);
 assert.match(detail,/quantity,selections:\[\.\.\.choices,\.\.\.omissions\]/);
 assert.match(detail,/Math\.min\(20,q\+1\)/);
 assert.match(cart,/quantity:Math\.min\(20,x\.quantity\+quantity\)/);
 assert.match(detail,/formatPrice\(\(Number\(details\.price_minor\)\+extra\)\*quantity,country,lang\)/);
});
test("merchant manages option groups with their child choices, no disconnected list",()=>{
 assert.match(mods,/beger-hq-option-groups/);
 assert.match(mods,/options\.filter\(o=>o\.group_id===g\.id\)/);
 assert.match(mods,/setOptionGroup\(g\.id\)/);
 assert.match(mods,/document\.getElementById\("beger-add-modifier-option"\)/);
 assert.match(mods,/\.\/product-options-manager\.css/);
});
test("HQ provides real Arabic Turkish English translations and language-direction controls",()=>{
 for(const phrase of ["أهلاً بك في Beger HQ","Beger HQ'ya hoş geldiniz","Welcome to Beger HQ"])assert.ok(hq.includes(phrase));
 assert.match(hq,/setLang\(saved\)/);
 assert.match(hq,/localStorage\.setItem\("beger-hq-language",v\)/);
 assert.match(hq,/dir=\{lang==="ar"\?"rtl":"ltr"\}/);
 assert.match(hq,/href="#customer-appearance"/);
 assert.doesNotMatch(hq,/fakeRevenue|2,856/);
});
