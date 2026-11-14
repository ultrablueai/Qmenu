"use client";
import {useEffect,useState} from "react";
import QrSvg from "../lib/qr/qr-svg";
import QrExport from "./qr-export";
export default function MenuProductQr({branchId,productId,productName}:{branchId:string;productId:string;productName:string}){
 const [show,setShow]=useState(false),[origin,setOrigin]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{setOrigin(window.location.origin)},[]);
 const path="/b/"+branchId+"?product="+encodeURIComponent(productId);
 const url=origin+path;
 return <div className="beger-product-qr">
  <button type="button" onClick={()=>setShow(v=>!v)} aria-expanded={show}>{show?"إخفاء QR":"▦ رمز QR للمنتج"}</button>
  {show?<div className="beger-product-qr-panel"><strong>{productName}</strong><p>رمز المنتج يفتح تفاصيله داخل منيو الفرع، ولا ينشئ طلباً.</p>
    <div id={"beger-product-code-"+branchId+"-"+productId}>{origin?<QrSvg value={url} size={162} label={"QR منتج "+productName}/>:<p>جارٍ تجهيز الرمز</p>}</div>
    {origin?<QrExport targetId={"beger-product-code-"+branchId+"-"+productId} fileName={"beger-product-"+branchId+"-"+productId} stickerTitle={productName}/>:null}
    <a target="_blank" rel="noopener noreferrer" href={path}>فتح صفحة المنتج ↗</a>
    <button type="button" disabled={!origin} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setMessage("تم نسخ الرابط")).catch(()=>setMessage("تعذّر النسخ. افتح رابط المنتج."))}>نسخ الرابط</button>
    {message?<small role="status">{message}</small>:null}
   </div>:null}
 </div>;
}
