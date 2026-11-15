"use client";
import {useState} from "react";
import type {GuestLang} from "../lib/g2-public";

type Tab="offers"|"rewards"|"notifications";
export default function GuestRewardsPreview({lang}:{lang:GuestLang}){
 const [tab,setTab]=useState<Tab>("offers");
 const text=lang==="ar"?{title:"مكافآتي",subtitle:"عروض ومكافآت زبائن المقهى",balance:"رصيد النقاط",unavailable:"لم يتم تفعيل برنامج الولاء بعد",progress:"تظهر نقاطك ومكافآتك بعد تشغيل البرنامج",offer:"العروض",rewards:"المكافآت",notifications:"الإشعارات",today:"العروض القادمة",soon:"ستظهر عروض المتجر هنا بعد تفعيلها",note:"لا توجد إشعارات حالياً",preview:"معاينة فقط — لا توجد نقاط أو عروض وهمية"}:lang==="tr"?{title:"Ödüllerim",subtitle:"Kafe sadakat ve fırsatlar",balance:"Puan Bakiyesi",unavailable:"Sadakat programı henüz aktif değil",progress:"Program başladığında puanlarınız burada görünür",offer:"Fırsatlar",rewards:"Ödüller",notifications:"Bildirimler",today:"Yaklaşan Fırsatlar",soon:"Kampanyalar etkinleştiğinde burada görünecek",note:"Henüz bildirim yok",preview:"Önizleme — uydurma puan veya indirim yok"}:{title:"My Rewards",subtitle:"Café loyalty and offers",balance:"Points Balance",unavailable:"Loyalty is not active yet",progress:"Your rewards will appear once the program starts",offer:"Offers",rewards:"Rewards",notifications:"Notifications",today:"Upcoming Offers",soon:"Your café's real offers will appear here",note:"No notifications yet",preview:"Preview only — no fabricated points or deals"};
 return <section className="beger-rewards-screen" aria-label={text.title}>
  <div className="beger-rewards-title"><span className="beger-rewards-eyebrow">BEGER · REWARDS</span><h2>{text.title}</h2><p>{text.subtitle}</p></div>
  <div className="beger-points-card">
   <div className="beger-points-icon" aria-hidden="true">✦</div>
   <div className="beger-points-body"><small>{text.balance}</small><strong>—</strong><span>{text.unavailable}</span></div>
   <span aria-hidden="true">›</span>
  </div>
  <p className="beger-rewards-progress-label">{text.progress}</p>
  <div className="beger-rewards-progress" role="progressbar" aria-label={text.balance} aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}><span/></div>
  <div className="beger-rewards-tabs" role="tablist" aria-label={text.title}>
   {(["offers","rewards","notifications"] as const).map(v=><button type="button" role="tab" aria-selected={tab===v} onClick={()=>setTab(v)} key={v}>{v==="offers"?text.offer:v==="rewards"?text.rewards:text.notifications}</button>)}
  </div>
  {tab==="offers"?<div className="beger-offer-preview"><img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1000&q=85&fit=crop" alt="" loading="lazy"/><div className="beger-offer-gradient"/><div className="beger-offer-copy"><small>{text.today}</small><h3>{text.offer}</h3><p>{text.soon}</p></div></div>:<div className="beger-rewards-empty"><span aria-hidden="true">{tab==="rewards"?"☆":"♧"}</span><p>{tab==="rewards"?text.unavailable:text.note}</p></div>}
  <div className="beger-rewards-notice">♧ <span>{text.preview}</span></div>
 </section>;
}
