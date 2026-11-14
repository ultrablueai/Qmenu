"use client";
import {useState} from "react";
type Props={targetId:string;fileName:string;label?:string;stickerTitle?:string};
export default function QrExport({targetId,fileName,label="حفظ QR للطباعة",stickerTitle}:Props){
 const [error,setError]=useState("");
 function save(){
  setError("");
  const element=document.getElementById(targetId);
  const source=element?.querySelector("svg");
  if(!source){setError("تعذّر العثور على رمز QR. أعد تحميل الصفحة.");return;}
  try{
   const copy=source.cloneNode(true) as SVGSVGElement;
   copy.setAttribute("xmlns","http://www.w3.org/2000/svg");
   copy.removeAttribute("style");
   copy.setAttribute("width","640");
   copy.setAttribute("height","640");
   if(stickerTitle){
    const viewBox=(source.getAttribute("viewBox")??"0 0 64 64").split(/\s+/).map(Number);
    const width=viewBox[2]||64;
    const height=viewBox[3]||width;
    const extra=Math.max(12,width*0.20);
    copy.setAttribute("viewBox",`0 0 ${width} ${height+extra}`);
    copy.setAttribute("height",String(Math.ceil(640*(height+extra)/width)));
    const ns="http://www.w3.org/2000/svg";
    const band=document.createElementNS(ns,"rect");
    band.setAttribute("x","0");band.setAttribute("y",String(height));
    band.setAttribute("width",String(width));band.setAttribute("height",String(extra));band.setAttribute("fill","#fff");
    copy.appendChild(band);
    const text=document.createElementNS(ns,"text");
    text.setAttribute("x",String(width/2));
    text.setAttribute("y",String(height+extra*0.65));
    text.setAttribute("font-size",String(Math.min(5,width/Math.max(12,stickerTitle.length*0.62))));
    text.setAttribute("font-family","Arial, sans-serif");
    text.setAttribute("font-weight","bold");
    text.setAttribute("text-anchor","middle");
    text.setAttribute("fill","#263a22");
    text.textContent=stickerTitle;
    copy.appendChild(text);
   }
   const svg=new XMLSerializer().serializeToString(copy);
   const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement("a");
   anchor.href=url;anchor.download=fileName.replace(/[^a-z0-9_.-]/gi,"-")+".svg";
   document.body.appendChild(anchor);
   anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setError("تعذّر حفظ QR. افتح رابط المنيو وجرّب مجدداً.");}
 }
 return <div className="beger-qr-export"><button type="button" onClick={save}>{label}</button>{error?<small role="alert">{error}</small>:null}</div>;
}
