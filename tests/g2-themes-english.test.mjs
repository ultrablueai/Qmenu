import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const migration=readFileSync("supabase/migrations/20261102062250_g2_themes_english.sql","utf8");
const localized=readFileSync("supabase/migrations/20261102062428_g2_public_english_rpc.sql","utf8");
const lib=readFileSync("lib/g2-public.ts","utf8");
const menu=readFileSync("components/public-menu.tsx","utf8");
const details=readFileSync("components/product-details.tsx","utf8");
const settings=readFileSync("app/dashboard/merchant-appearance.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const shop=readFileSync("app/b/[branchId]/page.tsx","utf8");
const table=readFileSync("app/t/[token]/page.tsx","utf8");
const catalog=readFileSync("app/dashboard/central-catalog.tsx","utf8");
const options=readFileSync("app/dashboard/product-options-manager.tsx","utf8");

test("merchant has exactly three approved premium themes and settings cannot leak raw tenant rows",()=>{
 for(const t of ["luxe_dark","clean_light","bold_commerce"]){
  assert.ok(migration.includes(t));assert.ok(menu.includes(t));assert.ok(settings.includes(t));
 }
 assert.match(migration,/business_menu_appearance ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON public\.business_menu_appearance FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.public_business_menu_appearance\(uuid\) TO anon,authenticated/);
 assert.match(settings,/\.upsert\(/);
 assert.match(hq,/<MerchantAppearance businessId=\{businessId\}/);
});
test("shop and table QR retrieve per-business theme and enabled languages",()=>{
 assert.match(shop,/loadGuestAppearance\(branchId\)/);
 assert.match(table,/loadGuestAppearance\(t\.branch_id\)/);
 assert.match(shop,/safeLanguage\(search\.lang,appearance\)/);
 assert.match(table,/safeLanguage\(search\.lang,appearance\)/);
 assert.match(lib,/enabled\.includes\(lang\)/);
 assert.match(menu,/appearance\.enabled_languages\.map/);
 assert.match(menu,/data-beger-theme=\{appearance\.theme\}/);
});
test("english product and modifier labels stored, publicly rendered with fallback",()=>{
 for(const field of ["name_en","description_en"])assert.ok(migration.includes(field));
 assert.match(localized,/'name_en'/);
 assert.match(localized,/'description_en'/);
 assert.match(localized,/coalesce\(nullif\(prod\.name_en,''\),prod\.name_ar\)/);
 assert.match(lib,/export type GuestLang = "ar"\|"tr"\|"en"/);
 assert.match(catalog,/name_en:nameEn\.trim\(\)\|\|null/);
 assert.match(options,/name_en:optionEn\.trim\(\)\|\|null/);
 assert.match(details,/en\?"Ingredients & extras"/);
 assert.match(menu,/lang==="ar"\?"rtl":"ltr"/);
});
test("themes are read-only guest preview, never customer authorization",()=>{
 assert.doesNotMatch(menu+details,/submitOrder|paymentIntent|service_role/);
 assert.match(migration,/m\.role IN \('owner','manager'\)/);
 assert.doesNotMatch(migration,/m\.role IN \('owner','manager','staff'\)/);
});

test("Olive Premium product customization remains legible and English prompts are complete",()=>{
 assert.match(menu,/dark=\{false\}/);
 assert.match(menu,/#FAF6EF/);
 assert.match(details,/dark\?:boolean/);
 assert.match(details,/\.\.\.panel,color:"#21383b"/);
 assert.match(details,/en\?" · Required"/);
 assert.match(details,/en\?"Free"/);
});

test("HQ appearance normalizes Supabase thenable before Promise.finally",()=>{
 assert.match(settings,/Promise\.resolve\(browserSupabase\(\)\.from\("business_menu_appearance"\)/);
 assert.match(settings,/\.finally\(\(\)=>\{if\(active\)setLoading\(false\)\}\)/);
});
