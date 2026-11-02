import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync("app/admin/page.tsx", "utf8");
const merchant = readFileSync("app/dashboard/page.tsx", "utf8");
const route = readFileSync("app/auth/signout/route.ts", "utf8");

test("owner and merchant dashboards both expose POST sign-out", () => {
  for (const page of [admin, merchant]) {
    assert.match(page, /action="\/auth\/signout"/);
    assert.match(page, /method="post"/);
  }
});
test("sign-out only redirects after the Supabase session was ended", () => {
  assert.match(route, /export async function POST/);
  assert.match(route, /await supabase\.auth\.signOut\(\)/);
  assert.match(route, /if \(error\)/);
  assert.match(route, /status: 503/);
  assert.match(route, /NextResponse\.redirect\(new URL\("\/login", request\.url\), 303\)/);
});
