import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(p,"utf8");
const source=read("lib/beger-sector-catalog.ts");
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const catalog=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const ui=read("components/beger-sector-configurator.tsx");
const dash=read("app/dashboard/page.tsx");

test("one multi-vertical sector registry maps supported models to compatible modules",()=>{
 const ids=catalog.sectors.map(s=>s.id);
 assert.deepEqual(ids,["cafe","restaurant","bakery","barber","salon","clinic","retail"]);
 assert.ok(catalog.sectorById("barber").availableCapabilities.includes("appointments"));
 assert.ok(!catalog.sectorById("barber").availableCapabilities.includes("kitchen_board"));
 assert.ok(!catalog.sectorById("clinic").availableCapabilities.includes("table_orders"));
 assert.ok(!catalog.sectorById("clinic").availableCapabilities.includes("customer_loyalty"));
 assert.ok(catalog.sectorById("restaurant").availableCapabilities.includes("table_orders"));
 assert.ok(catalog.sectorById("bakery").availableCapabilities.includes("scheduled_pickup"));
});
test("feature selection rejects forged or cross-sector entitlements",()=>{
 assert.deepEqual(catalog.sanitizeCapabilities("barber",["appointments","kitchen_board","appointments","made_up"]),["appointments"]);
 assert.deepEqual(catalog.sanitizeCapabilities("clinic",["table_orders","appointments","customer_loyalty"]),["appointments"]);
});
test("pricing and activation cannot be invented by preview selection",()=>{
 const p=catalog.previewPlan("cafe",["qr_catalog","appointments","scheduled_pickup"]);
 assert.deepEqual(p.enabled,["qr_catalog","scheduled_pickup"]);
 assert.deepEqual(p.pilot,["qr_catalog"]);
 assert.deepEqual(p.planned,["scheduled_pickup"]);
 assert.equal(p.priceMinor,null);
 assert.equal(p.paymentActive,false);
});
test("merchant dashboard displays model selector only for members authorized to manage branches",()=>{
 assert.match(dash,/canManageBranches \? <div id="business-model"/);
 assert.match(dash,/BegerSectorConfigurator key=\{primary\.id\} draftKey=\{primary\.id\} businessId=\{primary\.id\} canSave=\{currentRole==="owner"\}/);
 assert.match(dash,/import BegerSectorConfigurator/);
 assert.match(ui,/previewPlan\(sector,chosen\)/);
 assert.match(ui,/is-planned/);
 assert.match(ui,/اختيار ميزة لا يمنح صلاحية تشغيلها/);
 assert.match(ui,/localStorage\.setItem\("beger-sector-draft:"\+draftKey/);
 assert.match(ui,/\.from\("beger_merchant_model_preferences"\)\.upsert/);
 assert.match(ui,/updated_by:user\.id/);
 assert.match(dash,/canSave=\{currentRole==="owner"\}/);
 assert.doesNotMatch(ui,/service_role|checkout|subscription\.activate/);
});
