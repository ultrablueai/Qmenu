import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("components/public-menu.css","utf8");
const explorer=readFileSync("components/guest-catalog-explorer.tsx","utf8");
const menu=readFileSync("components/public-menu.tsx","utf8");
test("category tiles fit in a responsive grid rather than sideways scrolling",()=>{
 assert.match(css,/Pilot visual QA: all menu categories visible as compact tiles/);
 assert.match(css,/\.beger-catalog-browser \.beger-category-scroller\{\s*display:grid!important/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/scroll-snap-type:none!important/);
 assert.match(css,/min-height:66px!important/);
});
test("all and named category buttons omit product counts, keeping accessible pressed state",()=>{
 assert.match(explorer,/aria-pressed=\{selected==="all"\}/);
 assert.match(explorer,/aria-pressed=\{selected===category\.id\}/);
 assert.match(explorer,/onClick=\{\(\)=>setSelected\("all"\)\}/);
 assert.match(explorer,/onClick=\{\(\)=>setSelected\(category\.id\)\}/);
 assert.doesNotMatch(explorer,/<small>\{category\.count\}/);
 assert.doesNotMatch(explorer,/<small>\{total\}/);
 assert.doesNotMatch(menu,/<span className="beger-category-count">/);
});
