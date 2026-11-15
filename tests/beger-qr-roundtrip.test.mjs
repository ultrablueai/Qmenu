import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const QRCode=require("../lib/qr/vendor/index.js");
const jsQR=require("../lib/qr/decoder/jsQR.js");

function encodeAndRead(value){
 const qr=new QRCode(0,1);qr.addData(value);qr.make();
 const margin=4,scale=5,side=(qr.getModuleCount()+margin*2)*scale;
 const pixels=new Uint8ClampedArray(side*side*4);
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  const r=Math.floor(y/scale)-margin,c=Math.floor(x/scale)-margin;
  const black=r>=0&&c>=0&&r<qr.getModuleCount()&&c<qr.getModuleCount()&&qr.isDark(r,c);
  const i=(y*side+x)*4,p=black?0:255;
  pixels[i]=p;pixels[i+1]=p;pixels[i+2]=p;pixels[i+3]=255;
 }
 return jsQR(pixels,side,side)?.data??null;
}

test("Beger first-party QR encoder and local decoder round-trip real shop, table and product links",()=>{
 const origin="https://qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app";
 const links=[
  origin+"/b/b0000000-2026-4000-8000-000000000002",
  origin+"/t/6bb2f130-01d3-4d30-917d-0a181f92f7b0",
  origin+"/b/b0000000-2026-4000-8000-000000000002?product=ef2a5399-853a-40c6-9719-2bfb79db9d80"
 ];
 for(const link of links)assert.equal(encodeAndRead(link),link);
});
