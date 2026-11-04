import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// UI regression checks. These cover the failed-initial-fetch recovery contract;
// browser E2E and live role verification remain separate release gates.
for (const station of ["cashier", "kitchen"]) {
  const source=readFileSync("app/dashboard/merchant-"+station+".tsx","utf8");
  test(station+" stops displaying the loading indicator after a failed initial fetch",()=>{
    assert.match(source,/!loaded&&!error\?<p role="status">جارٍ تحميل الطلبات…<\/p>/);
    assert.match(source,/refresh\(\)\.catch\(\(\)=>\{if\(active\)setError\(/);
    assert.doesNotMatch(source,/!loaded\?<p role="status">جارٍ تحميل الطلبات…<\/p>/);
  });
  test(station+" clears a stale error once a later refresh succeeds",()=>{
    assert.match(source,/if\(error\|\|!Array\.isArray\(data\)\)throw Error/);
    assert.match(source,/setOrders\(data as Order\[\]\);setLoaded\(true\);setError\(""\);/);
  });
}
