"use client";
import {useState} from "react";
import type {GuestLang} from "../lib/g2-public";

export default function GuestRatingPreview({lang}:{lang:GuestLang}){
 const [rating,setRating]=useState(0);
 const [show,setShow]=useState(false);
 const labels=lang==="en"?{label:"Ratings",none:"No verified reviews yet",rate:"Try the rating experience",saved:"Preview only — your rating was not published",close:"Close"}:lang==="tr"?{label:"Değerlendirmeler",none:"Henüz doğrulanmış yorum yok",rate:"Puanlama deneyimini dene",saved:"Yalnızca önizleme — puanınız yayınlanmadı",close:"Kapat"}:{label:"التقييمات",none:"لا توجد تقييمات موثقة بعد",rate:"جرّب تجربة التقييم",saved:"تجربة فقط — لم يُنشر تقييمك",close:"إغلاق"};
 return <div style={{marginTop:13,borderTop:"1px solid #edf1ec",paddingTop:11}}>
  <button type="button" onClick={()=>setShow(!show)} aria-expanded={show} style={{font:"inherit",fontSize:12,fontWeight:700,border:0,padding:0,cursor:"pointer",background:"none",color:"#758479"}}>☆ {labels.label} · {labels.none} {show?"⌃":"⌄"}</button>
  {show?<div style={{padding:"13px 0 3px",color:"#475f52"}}>
   <p style={{fontSize:12,margin:"0 0 10px"}}>{labels.rate}</p>
   <div role="group" aria-label={labels.rate} style={{display:"flex",gap:7}}>
    {[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={n+" / 5"} aria-pressed={rating===n} onClick={()=>setRating(n)} style={{border:"1px solid #e7e4da",borderRadius:10,padding:"4px 8px",background:rating>=n?"#fff4d6":"#fff",color:rating>=n?"#bb851a":"#a3a9a0",fontSize:23,cursor:"pointer"}}>★</button>)}
   </div>
   {rating>0?<p role="status" style={{fontSize:12,color:"#7d7457",margin:"9px 0 0"}}>{labels.saved}</p>:null}
  </div>:null}
 </div>;
}
