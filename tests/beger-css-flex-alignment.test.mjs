import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Flexbox cross-browser regression based on the actual Vercel Autoprefixer warnings.
for (const file of ["app/dashboard/merchant-pager.css","app/dashboard/merchant-staff.css"]) {
 test(file+" uses supported flex-end alignment without ambiguous end value",()=>{
  const css=readFileSync(file,"utf8");
  assert.match(css,/align-items\s*:\s*flex-end\s*;/);
  assert.doesNotMatch(css,/align-items\s*:\s*end\s*;/);
 });
}
