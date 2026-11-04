import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("app/dashboard/page.tsx","utf8");
const hq=readFileSync("app/dashboard/headquarters-catalog.tsx","utf8");
const css=readFileSync("app/dashboard/merchant-workspace.css","utf8");
const overview=readFileSync("app/dashboard/hq-reference-overview.tsx","utf8");

test("merchant dashboard is routed into separate workspaces instead of rendering everything below Overview",()=>{
 assert.match(page,/workspaceViews=\["overview","branches","operations","settings","modules"\]/);
 assert.match(page,/workspaceView==="operations"&&!loadError/);
 assert.match(page,/workspaceView==="branches"\?<div/);
 assert.match(page,/workspaceView==="settings"&&!loadError/);
 assert.match(page,/workspaceView==="modules"\?<section/);
 assert.match(page,/workspaceHref\("operations"\)/);
 assert.match(page,/encodeURIComponent\(primary\?\.id\?\?""\)/);
});
test("merchant workspace exposes independent editable panels without mixing queues, QR, catalog and design",()=>{
 assert.match(hq,/type Workspace="orders"\|"pager"\|"reports"\|"catalog"\|"qr"\|"appearance"\|"reviews"\|"loyalty"\|"legacy"/);
 assert.match(hq,/useState<Workspace>\("orders"\)/);
 assert.match(hq,/className="beger-workspace-tabs"/);
 assert.match(hq,/onClick=\{\(\)=>setWorkspace\(section\.id\)\}/);
 for(const group of ["orders","pager","reports","catalog","qr","appearance","reviews","loyalty","legacy"])assert.match(hq,new RegExp('workspace==="'+group+'"\\?'));
 assert.match(hq,/MerchantOrderBoard key=/);
 assert.match(hq,/MerchantTableQr key=/);
 assert.match(hq,/CentralCatalog businessId=/);
 assert.match(hq,/MerchantAppearance businessId=/);
 assert.match(hq,/MenuManager key=/);
});
test("responsive navigation uses warm editorial design and accessible selection",()=>{
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.beger-workspace-tab\.is-current/);
 assert.match(css,/\.beger-workspace-tab:focus-visible/);
 assert.match(hq,/aria-current=\{workspace===section\.id\?"page":undefined\}/);
 assert.match(overview,/href="\/dashboard\?view=operations#catalog-management"/);
 assert.match(overview,/href="\/dashboard\?view=operations#customer-appearance"/);
});
