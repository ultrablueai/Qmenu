"use client";
import {useEffect,useState,type FormEvent} from "react";
import {createClient} from "@supabase/supabase-js";
import type {GuestLang} from "../lib/g2-public";

type T={heading:string;intro:string;send:string;sent:string;already:string;optional:string;error:string;invalid:string;close:string};
const translations:Record<GuestLang,T>={
 ar:{heading:"كيف كانت تجربتك؟",intro:"قيّم طلبك بعد الاستلام. تعليقك يظهر لإدارة المتجر فقط.",send:"إرسال التقييم",sent:"شكراً! تم تسجيل تقييمك.",already:"تم تقييم هذا الطلب سابقاً.",optional:"ملاحظة اختيارية لإدارة المتجر",error:"تعذّر إرسال التقييم. حاول مرة أخرى.",invalid:"اختر تقييماً من نجمة إلى خمس نجوم.",close:"إخفاء التقييم"},
 tr:{heading:"Deneyiminiz nasıldı?",intro:"Teslim aldığınız siparişi değerlendirin. Yorumunuzu yalnızca işletme yönetimi görür.",send:"Değerlendirmeyi gönder",sent:"Teşekkürler! Değerlendirmeniz kaydedildi.",already:"Bu sipariş zaten değerlendirildi.",optional:"İşletmeye isteğe bağlı not",error:"Değerlendirme gönderilemedi. Tekrar deneyin.",invalid:"1 ile 5 arasında yıldız seçin.",close:"Değerlendirmeyi gizle"},
 en:{heading:"How was your experience?",intro:"Rate your completed order. Your note is visible only to store management.",send:"Send rating",sent:"Thank you! Your rating was saved.",already:"You already rated this order.",optional:"Optional note to the store",error:"Couldn't submit your rating. Please retry.",invalid:"Choose one to five stars.",close:"Hide rating"}
};
function publicClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("Missing public Supabase configuration");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export default function GuestOrderRating({token,lang}:{token:string;lang:GuestLang}){
 const t=translations[lang];
 const [stars,setStars]=useState(0),[note,setNote]=useState("");
 const [submitted,setSubmitted]=useState(false),[eligible,setEligible]=useState(false);
 const [busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[message,setMessage]=useState("");
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  let live=true;setStars(0);setNote("");setSubmitted(false);setEligible(false);setChecking(true);setMessage("");setOpen(false);
  Promise.resolve(publicClient().rpc("g5_order_rating_state",{p_token:token})).then(({data,error})=>{
   if(!live)return;
   if(error||!data){setMessage(t.error);return;}
   setEligible(data.eligible===true);setSubmitted(data.submitted===true);
  }).catch(()=>{if(live)setMessage(t.error)}).finally(()=>{if(live)setChecking(false)});
  return()=>{live=false};
 },[token,t.error]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy||submitted||!eligible)return;
  if(stars<1||stars>5){setMessage(t.invalid);return;}
  setBusy(true);setMessage("");
  try{
   const {data,error}=await publicClient().rpc("g5_submit_order_rating",{p_token:token,p_stars:stars,p_comment:note.trim()||null});
   if(error||data?.submitted!==true)throw error??Error("Rating not confirmed");
   setSubmitted(true);setMessage(data.alreadySubmitted===true?t.already:t.sent);
  }catch{setMessage(t.error)}finally{setBusy(false)}
 }
 if(checking||(!eligible&&!submitted))return null;
 return <section className="beger-order-rating" aria-label={t.heading}>
  {submitted?<p role="status" className="beger-rating-done">★ {message||t.already}</p>:<>
   <button type="button" className="beger-rating-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
    <span aria-hidden="true">☆</span><strong>{t.heading}</strong><span aria-hidden="true">{open?"⌃":"⌄"}</span>
   </button>
   {open?<form onSubmit={submit} className="beger-rating-form">
    <p>{t.intro}</p>
    <fieldset><legend>{t.heading}</legend><div className="beger-rating-stars">
     {[1,2,3,4,5].map(value=><button type="button" key={value} aria-label={value+" / 5"} aria-pressed={stars===value} onClick={()=>setStars(value)} className={value<=stars?"is-picked":""}>★</button>)}
    </div></fieldset>
    <label>{t.optional}<textarea maxLength={280} rows={2} value={note} onChange={e=>setNote(e.target.value)} /></label>
    {message?<p role="alert">{message}</p>:null}
    <button type="submit" disabled={busy||stars===0}>{busy?"…":t.send}</button>
   </form>:null}
  </>}
 </section>;
}
