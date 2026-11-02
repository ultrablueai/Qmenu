import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
const css = readFileSync("app/dashboard/dashboard.module.css", "utf8");

test("dashboard verifies user and filters membership and tenant reads", () => {
 assert.match(dashboard, /supabase\.auth\.getUser\(\)/);
 assert.match(dashboard, /\.eq\("user_id", user\.id\)/);
 assert.match(dashboard, /\.from\("businesses"\)\.select\("id,name,country_code"\)\.in\("id", ids\)/);
 assert.match(dashboard, /\.from\("branches"\)\.select\("id,business_id,name"\)\.in\("business_id", ids\)/);
});

test("dashboard shows real merchant identity and avoids fabricated sales metrics", () => {
 assert.match(dashboard, /primary\?\.name/);
 assert.match(dashboard, /primaryBranches\.length/);
 assert.match(dashboard, /loadError/);
 assert.doesNotMatch(dashboard, /Math\.random|fakeRevenue|sampleOrders|demoSales/);
});

test("future modules are clearly marked as not yet available", () => {
 assert.match(dashboard, /status: "قريباً"/);
 assert.match(dashboard, /aria-disabled="true"/);
});

test("dashboard remains responsive and respects reduced motion", () => {
 assert.match(css, /@media\(max-width:720px\)/);
 assert.match(css, /@media\(max-width:360px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(dashboard, /aria-label="التنقل السريع"/);
});
