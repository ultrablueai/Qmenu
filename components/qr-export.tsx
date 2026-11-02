"use client";
import {useState} from "react";
type Props={targetId:string;fileName:string;label?:string};
export default function QrExport({targetId,fileName,label="حفظ QR للطباعة"}:Props){
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
