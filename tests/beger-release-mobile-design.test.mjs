import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const board=readFileSync("app/dashboard/merchant-order-board.css","utf8");
const menu=readFileSync("components/public-menu.css","utf8");

test("merchant order board uses four desktop, two tablet and one phone columns without sideways overflow",()=>{
 assert.match(board,/Release candidate: readable Kanban/);
 assert.match(board,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(board,/@media\(max-width:1180px\)\{\s*\.beger-order-board-columns\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(board,/@media\(max-width:640px\)/);
 assert.match(board,/\.beger-order-board-columns\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:12px;overflow-x:visible\}/);
 assert.match(board,/\.beger-order-ticket button\{min-height:44px\}/);
});
test("order journey status stays readable in RTL on narrow phones instead of breaking labels",()=>{
 assert.match(menu,/Release candidate: readable order journey/);
 assert.match(menu,/\.beger-order-steps li\{min-width:0;line-height:1\.5;word-break:normal;overflow-wrap:normal;hyphens:none;text-align:center\}/);
 assert.match(menu,/@media\(max-width:520px\)/);
 assert.match(menu,/\.beger-order-steps\{display:flex;gap:8px;overflow-x:auto;/);
 assert.match(menu,/\.beger-order-steps li\{flex:0 0 82px;min-width:82px;/);
 assert.match(menu,/scroll-snap-align:start/);
});
