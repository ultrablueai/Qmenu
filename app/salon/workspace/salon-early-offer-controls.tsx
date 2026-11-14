"use client";
import {useMemo,useState} from "react";
import {browserSupabase} from "../../../lib/supabase/browser";
const localInput=(iso:string)=>{
 const d=new Date(new Date(iso).getTime()-30*60*1000);
 const p=(n:number)=>String(n).padStart(2,"0");
 return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes());
};
export default function SalonEarlyOfferControls({businessId,bookingId,startsAt,onCreated}:{
 businessId:string;bookingId:string;startsAt:string;onCreated:()=>void
}){
 const initial=useMemo(()=>localInput(startsAt),[startsAt]);
 const [when,setWhen]=useState(initial);
 const [busy,setBusy]=useState(false),[info,setInfo]=useState(""),[error,setError]=useState("");
 async function invite(){
  if(busy||!when)return;
  const start=new Date(when);
  if(!Number.isFinite(start.getTime()))return;
  if(!window.confirm("عرض هذا الموعد الأبكر على الزبون؟ عنده 5 دقائق ليوافق أو يرفض؛ موعده الأصلي يبقى محفوظاً."))return;
  setBusy(true);setInfo("");setError("");
  try{
   const {data,error:e}=await browserSupabase().rpc("beger_g56_offer_early_slot",{
    p_business:businessId,p_booking:bookingId,p_proposed_start:start.toISOString()
   });
   if(e||data?.status!=="pending"||data?.original_booking_unchanged!==true)throw Error("Rejected");
   setInfo("انرسل العرض للزبون على صفحة متابعة موعده. عنده 5 دقائق ليختار. موعده الأصلي لم يتغيّر.");
   onCreated();
  }catch{
   setError("ما قدرنا نرسل العرض. تأكد أن الموعد مؤكد، الوقت أبكر بـ10 إلى 180 دقيقة، وما في تضارب أو عرض معلق.");
  }finally{setBusy(false)}
 }
 return <div style={{display:"grid",gap:8,background:"#f0f8f2",border:"1px solid #d8e8db",padding:11,borderRadius:11}}>
  <strong style={{fontSize:13,color:"#1d6949"}}>عندي فراغ — اعرض موعداً أبكر</strong>
  <p style={{fontSize:11,color:"#637d6b",margin:0}}>الزبون يقرر القبول أو الرفض خلال 5 دقائق، وممنوع تعديل موعده بدون موافقته.</p>
  <div style={{display:"flex",gap:9,alignItems:"end",flexWrap:"wrap"}}>
   <label style={{display:"grid",gap:5,fontSize:12,flex:"1 1 185px"}}>وقت الموعد المقترح<input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} style={{padding:10,border:"1px solid #c8ddce",borderRadius:9,width:"100%"}}/></label>
   <button type="button" disabled={busy||!when} onClick={()=>void invite()} style={{border:0,background:"#216e4e",color:"#fff",padding:"12px 14px",borderRadius:9,fontWeight:850,opacity:busy?.5:1}}>{busy?"جارٍ الإرسال…":"أرسل العرض للزبون"}</button>
  </div>
  {info?<small role="status" style={{color:"#266b4b"}}>{info}</small>:null}
  {error?<small role="alert" style={{color:"#a05240"}}>{error}</small>:null}
 </div>;
}
