"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
const base="https://qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app";
type LinkData={slug:string;published:boolean;public_booking_enabled:boolean};
export default function SalonPublicLinkSetup({businessId}:{businessId:string}){
 const [state,setState]=useState<LinkData|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [error,setError]=useState("");
 async function setLink(publish:boolean,book:boolean){
  if(busy)return;
  if((publish||book)&&!window.confirm("تنبيه: سيصبح الرابط متاحاً لأي زائر من الإنترنت وقد تصل حجوزات فعلية إلى Staging. هل تريد المتابعة؟"))return;
  setBusy(true);setNotice("");setError("");
  try{
   const {data,error:e}=await browserSupabase().rpc("beger_g51_owner_salon_link",
    {p_business:businessId,p_publish:publish,p_enable_bookings:book});
   if(e||!data?.slug||data.published!==publish||data.public_booking_enabled!==book)throw new Error("link setup rejected");
   setState(data as LinkData);
   setNotice(book?"تم تفعيل استقبال الحجوزات على رابط Staging. راقب الحجوزات بنفسك.":publish?"الرابط ظاهر للعرض والحجز معطّل.":"الرابط غير منشور والحجز معطّل.");
  }catch{setError("تعذّر تعديل الرابط. تحتاج حساب مالك الصالون المرتبط بهذا النشاط.");}
  finally{setBusy(false)}
 }
 const url=state?base+"/salon/book/"+encodeURIComponent(state.slug):"";
 async function copy(){if(!url)return;try{await navigator.clipboard.writeText(url);setNotice("تم نسخ رابط الحجز")}catch{setNotice("انسخ الرابط يدوياً من الحقل")}}
 return <section style={{background:"#fff",border:"1px solid #d8e7dd",borderRadius:15,padding:20,display:"grid",gap:13}}>
 <h2 style={{margin:0,fontSize:20}}>رابط الزبون الحقيقي وQR الصالون</h2>
 <p style={{fontSize:12,color:"#607e68",lineHeight:1.7,margin:0}}>الرابط العام خاص بهذا الصالون على Staging. لن يُسمح للزبون بإنشاء حجز إلا عندما تفعّله أنت. لا تختبره مع زبائن حقيقيين قبل اكتمال المراجعة.</p>
 <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
 <button disabled={busy} onClick={()=>void setLink(false,false)} style={{padding:11,borderRadius:9,border:"1px solid #b7d5bf",background:"#f4faf5",color:"#1d5d3b",fontWeight:800}}>إنشاء رابط خاص بدون نشر</button>
 <button disabled={busy||!state} onClick={()=>void setLink(true,false)} style={{padding:11,borderRadius:9,border:"1px solid #b7d5bf",background:"#f4faf5",color:"#1d5d3b",fontWeight:800}}>عرض الصفحة بدون حجوزات</button>
 <button disabled={busy||!state} onClick={()=>void setLink(true,true)} style={{padding:11,borderRadius:9,border:0,background:"#206d4f",color:"#fff",fontWeight:800}}>تفعيل حجوزات Staging</button>
 <button disabled={busy||!state} onClick={()=>void setLink(false,false)} style={{padding:11,borderRadius:9,border:"1px solid #e5c6bf",background:"#fff5f2",color:"#9b4239",fontWeight:800}}>إيقاف الرابط والحجوزات</button>
 </div>
 {state?<div style={{display:"grid",gap:10}}>
 <label style={{fontSize:12,fontWeight:800}}>رابط الحجز الخاص بهذا الصالون<input readOnly value={url} onFocus={e=>e.currentTarget.select()} style={{width:"100%",padding:12,borderRadius:9,border:"1px solid #cdded1",marginTop:6,direction:"ltr",textAlign:"left"}}/></label>
 <span style={{fontSize:12,color:state.public_booking_enabled?"#1b7452":"#8d6b3e"}}>{state.public_booking_enabled?"الحجز العام مفعّل على Staging":state.published?"صفحة العرض منشورة، الحجز معطّل":"الرابط الخاص غير منشور"}</span>
 <div style={{display:"flex",gap:9,flexWrap:"wrap"}}><button onClick={()=>void copy()} style={{padding:10,borderRadius:9,border:"1px solid #bddcc7",background:"#eaf5ed"}}>نسخ الرابط</button>{state.published?<a href={url} rel="noopener noreferrer" target="_blank" style={{padding:10,color:"#205a41"}}>فتح صفحة الزبون</a>:null}</div>
 {state.published?<img src={"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent(url)} alt="QR حجز صالون Staging" width={180} height={180}/>:null}
 </div>:null}
 {notice?<p role="status" style={{color:"#226d4e",fontSize:12}}>{notice}</p>:null}{error?<p role="alert" style={{color:"#a34a40",fontSize:12}}>{error}</p>:null}
 <small style={{color:"#778579"}}>تنبيه: أداة QR الخارجية ترسل رابط الصالون العام إلى مزود خدمة توليد الرمز. لا تتضمن بيانات الحجز الخاصة.</small>
 </section>;
}
