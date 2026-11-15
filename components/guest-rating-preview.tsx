"use client";
import {useState} from "react";
import type {GuestLang} from "../lib/g2-public";

export default function GuestRatingPreview({lang}:{lang:GuestLang}){
 const [rating,setRating]=useState(0);
 const [show,setShow]=useState(false);
 const labels=lang==="en"?{label:"Ratings & reviews",none:"No verified reviews yet",rate:"Try the rating experience",saved:"Preview only — your rating was not published",close:"Close",eyebrow:"COMMUNITY",value:"Not rated",help:"Real reviews will appear after verified reviews are enabled"}:lang==="tr"?{label:"Puanlar ve yorumlar",none:"Henüz doğrulanmış yorum yok",rate:"Puanlama deneyimini dene",saved:"Yalnızca önizleme — puanınız yayınlanmadı",close:"Kapat",eyebrow:"TOPLULUK",value:"Henüz puan yok",help:"Doğrulanmış yorumlar etkinleştirildiğinde burada görünecek"}:{label:"التقييمات وآراء العملاء",none:"لا توجد تقييمات موثقة بعد",rate:"جرّب تجربة التقييم",saved:"تجربة فقط — لم يُنشر تقييمك",close:"إغلاق",eyebrow:"آراء العملاء",value:"لم يُقيّم بعد",help:"ستظهر التقييمات الحقيقية بعد تفعيل نظام التقييمات الموثقة"};
 return <section style={{marginTop:14,borderTop:"1px solid #e7eee9",paddingTop:13}}>
  <button type="button" onClick={()=>setShow(!show)} aria-expanded={show} style={{display:"flex",width:"100%",alignItems:"center",justifyContent:"space-between",gap:10,font:"inherit",fontSize:12,fontWeight:750,border:0,padding:"7px 0",cursor:"pointer",background:"none",color:"#65776c",textAlign:"start"}}>
   <span style={{display:"inline-flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span aria-hidden="true" style={{fontSize:17,color:"#BE9239"}}>☆</span>{labels.label}<span style={{fontWeight:500,color:"#89958c"}}>· {labels.none}</span></span>
   <span aria-hidden="true" style={{fontSize:16}}>{show?"⌃":"⌄"}</span>
  </button>
  {show?<div style={{border:"1px solid #e7eee7",borderRadius:18,padding:16,marginTop:9,background:"#F9FBF8",color:"#263d30"}}>
   <span style={{fontSize:10,fontWeight:800,letterSpacing:".1em",color:"#738578"}}>{labels.eyebrow}</span>
   <div style={{display:"flex",alignItems:"center",gap:12,marginTop:7,flexWrap:"wrap"}}>
    <strong style={{fontSize:18}}>{labels.value}</strong><span aria-label={labels.none} style={{fontSize:21,color:"#C8D0C6",letterSpacing:2}}>☆☆☆☆☆</span>
   </div>
   <p style={{fontSize:12,color:"#6F8072",lineHeight:1.8,margin:"6px 0 14px"}}>{labels.help}</p>
   <div style={{borderTop:"1px solid #e3eae2",paddingTop:13}}>
    <p style={{fontSize:13,fontWeight:750,margin:"0 0 9px"}}>{labels.rate}</p>
    <div role="group" aria-label={labels.rate} style={{display:"flex",gap:5,flexWrap:"wrap"}}>
     {[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={n+" / 5"} aria-pressed={rating===n} onClick={()=>setRating(n)} style={{border:"1px solid "+(rating===n?"#e8cc8b":"#e7e9dd"),borderRadius:12,width:43,height:43,background:rating>=n?"#FFF3D5":"#fff",color:rating>=n?"#BD8421":"#B2BAAD",fontSize:25,cursor:"pointer",transition:"background .15s"}}>★</button>)}
    </div>
    {rating>0?<p role="status" style={{fontSize:12,color:"#7C6A41",background:"#FFF7E5",borderRadius:10,padding:"10px 12px",margin:"12px 0 0"}}>{labels.saved}</p>:null}
   </div>
  </div>:null}
 </section>;
}
