import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const catalog=readFileSync("app/dashboard/central-catalog.tsx","utf8");
const product=readFileSync("app/dashboard/edit-central-product.tsx","utf8");
const category=readFileSync("app/dashboard/edit-central-category.tsx","utf8");
const branch=readFileSync("app/dashboard/branches/[branchId]/page.tsx","utf8");
test("HQ can modify every product translation and public detail after initial creation",()=>{
 assert.match(catalog,/<EditCentralProduct/);
 assert.match(catalog,/\.from\("catalog_products"\)\.update\(patch\)\.eq\("id",prod\.id\)\.eq\("business_id",businessId\)\.select\("id"\)\.single\(\)/);
 for(const field of ["name_ar","name_tr","name_en","description_ar","description_tr","description_en","image_url","active","category_id"])assert.ok(product.includes(field),field);
 assert.match(product,/https:/);
 assert.match(product,/if\(ok\)setOpen\(false\)/);
 assert.doesNotMatch(branch,/<EditCentralProduct/);
});
test("HQ category editing is scoped to its merchant business and remains reversible",()=>{
 assert.match(catalog,/<EditCentralCategory/);
 assert.match(catalog,/\.from\("catalog_categories"\)\.update\(patch\)\.eq\("id",c\.id\)\.eq\("business_id",businessId\)\.select\("id"\)\.single\(\)/);
 assert.match(category,/name_en:en\.trim\(\)\|\|null/);
 assert.match(category,/if\(await onSave/);
 assert.doesNotMatch(branch,/<EditCentralCategory/);
});
