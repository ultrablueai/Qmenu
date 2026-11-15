"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {GuestLang} from "../lib/g2-public";

type Card={enabled:boolean;target:number;stamps:number};
const words={
 ar:{heading:"بطاقة أختام Beger",intro:"ختم واحد بعد استلام الطلب. بطاقة تجريبية بلا خصومات أو مكافآت قابلة للصرف.",claim:"إضافة ختم لهذا الطلب",stored:"تم حفظ الختم على بطاقتك",used:"تم استخدام هذا الطلب سابقاً للحصول على ختم",error:"تعذّر إضافة الختم، حاول مجدداً.",stamps:"ختم",noRedeem:"الأختام للتجربة فقط، والاستبدال غير متاح بعد."},
 tr:{heading:"Beger Damga Kartı",intro:"Teslim alınan her sipariş için bir damga. Henüz indirim veya ödül kullanımı yok.",claim:"Bu siparişin damgasını ekle",stored:"Damga kartınıza kaydedildi",used:"Bu siparişin damgası daha önce alınmış",error:"Damga eklenemedi, tekrar deneyin.",stamps:"damga",noRedeem:"Damgalar pilot amaçlıdır; ödül kullanımı henüz açık değil."},
 en:{heading:"Beger Stamp Card",intro:"One stamp per completed order. No redeemable discounts or rewards yet.",claim:"Claim this order's stamp",stored:"Stamp saved to your card",used:"This order's stamp was already claimed",error:"Couldn't add stamp, please retry.",stamps:"stamps",noRedeem:"This is a pilot. Reward redemption is not available yet."}
};
function publicClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("Supabase public key unavailable");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
const walletKey=(branchId:string)=>"beger-g5-loyalty-card:"+branchId;
export default function GuestLoyaltyStamp({branchId,orderToken,lang}:{branchId:string;orderToken:string;lang:GuestLang}){
 const t=words[lang],key=walletKey(branchId);
 const [card,setCard]=useState<Card|null>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [claimed,setClaimed]=useState(false);
 const [checking,setChecking]=useState(true);
 useEffect(()=>{
  let active=true;
  setChecking(true);setCard(null);setClaimed(false);setNotice("");
  let token:string|null=null;
  try{token=localStorage.getItem(key)}catch{/* optional guest storage */}
  Promise.resolve(publicClient().rpc("g5_loyalty_card",{p_branch:branchId,p_wallet_token:token}))
   .then(({data,error})=>{
    if(!active)return;
    if(error||!data||data.enabled!==true)return;
    setCard(data as Card);
    try{setClaimed(sessionStorage.getItem("beger-g5-stamp-claimed:"+orderToken)==="yes")}catch{/* optional */}
   }).catch(()=>{/* feature may be disabled or temporarily unavailable */})
   .finally(()=>{if(active)setChecking(false)});
  return()=>{active=false};
 },[branchId,orderToken,key]);
 async function claim(){
  if(busy||claimed||!card)return;
  setBusy(true);setNotice("");
  let wallet:string|null=null;
  try{wallet=localStorage.getItem(key)}catch{/* optional */}
  try{
   const {data,error}=await publicClient().rpc("g5_loyalty_claim",{p_order_token:orderToken,p_wallet_token:wallet});
   if(error||!data||!data.claimed||typeof data.walletToken!=="string")throw Error(error?.message||"claim failed");
   try{
    localStorage.setItem(key,data.walletToken);
    sessionStorage.setItem("beger-g5-stamp-claimed:"+orderToken,"yes");
   }catch{/* browser may block storage */}
   setCard({enabled:true,stamps:Number(data.stamps),target:Number(data.target)});
   setClaimed(true);setNotice(t.stored);
  }catch(e){setNotice(e instanceof Error&&/already claimed/i.test(e.message)?t.used:t.error);}
  finally{setBusy(false)}
 }
 if(checking||!card)return null;
 return <section className="beger-loyalty-customer" aria-label={t.heading} dir={lang==="ar"?"rtl":"ltr"}>
  <strong>✦ {t.heading}</strong>
  <div className="beger-loyalty-customer-stamps" role="img" aria-label={card.stamps+" / "+card.target+" "+t.stamps}>
   {Array.from({length:Math.min(card.target,20)},(_,index)=><span key={index} className={index<(card.stamps%card.target|| (card.stamps>0?card.target:0))?"is-earned":""} aria-hidden="true">★</span>)}
  </div>
  <p>{card.stamps} {t.stamps} · {t.intro}</p>
  {!claimed?<button type="button" disabled={busy} onClick={()=>void claim()}>{busy?"…":t.claim}</button>:null}
  {notice?<p role="status" className="beger-loyalty-customer-notice">{notice}</p>:null}
  <small>{t.noRedeem}</small>
 </section>;
}
