"use client";
import {useState} from "react";
import Link from "next/link";
import "../salon.css";
const base="https://qmenu-staging-git-feat-g1-foundation-ultrablueais-projects.vercel.app/demo/salon/customer";
const sourceLink=(source:string)=>base+"?source="+encodeURIComponent(source);
const message="احجز موعدك في صالون Beger التجريبي بسهولة، اختر الخدمات والمعلم والوقت من هاتفك:\n"+sourceLink("whatsapp");
export default function SalonShareKit(){
 const [notice,setNotice]=useState("");
 async function copy(value:string){
  try{await navigator.clipboard.writeText(value);setNotice("تم نسخ الرابط، يمكنك وضعه في حساب المحل أو إرساله للزبائن.");}
  catch{setNotice("تعذّر النسخ التلقائي. حدّد الرابط الموجود أدناه وانسخه يدوياً.");}
 }
 async function share(){
  if(navigator.share){
   try{await navigator.share({title:"Beger Salon — احجز موعدك",text:"احجز موعد صالون تجريبي",url:sourceLink("share")});}
   catch{setNotice("المشاركة لم تكتمل؛ يمكنك نسخ الرابط بدلاً منها.");}
  }else await copy(sourceLink("share"));
 }
 return <main className="bs-page" lang="ar" dir="rtl"><div className="bs-wrap">
  <header className="bs-role-head"><div><span className="bs-eyebrow">BEGER · G43 SHARE & QR</span><h1>مركز نشر رابط حجز الصالون</h1><p>QR جاهز للطباعة على باب المحل والمرآة والكروت، مع روابط مناسبة للموبايل والسوشيال ميديا.</p></div><Link href="/demo/salon/owner">العودة للوحة الصالون</Link></header>
  <p className="bs-demo">نسخة عرض فقط: الرمز يفتح صفحة تجريبية، وليس حجوزات مشتركة بين الهواتف</p>
  <section className="bs-share-layout">
   <article className="bs-panel bs-print-poster" aria-label="لوحة QR قابلة للطباعة">
    <span className="bs-eyebrow">BEGER · BARBER STUDIO</span>
    <h2>احجز موعدك من موبايلك</h2>
    <p>اختَر خدماتك، معلم الحلاقة والوقت اللي بناسبك</p>
    <img alt="رمز QR يفتح صفحة حجز الزبون التجريبية" width="300" height="300" className="bs-poster-qr" src="/demo/beger-salon-customer-qr.svg"/>
    <strong>امسح الرمز بالكاميرا</strong>
    <p className="bs-poster-link">{base}</p>
    <small>DEMO · مسار تجريبي، وليس صالوناً حقيقياً</small>
   </article>
   <div className="bs-share-tools">
    <section className="bs-panel">
     <h2>رابط الزبون المباشر</h2>
     <p className="bs-fine">الزبون يفتح الصفحة من المتصفح مباشرة، بدون تنزيل تطبيق أو إنشاء حساب للمعاينة.</p>
     <input className="bs-share-url" readOnly aria-label="رابط صفحة الحجز" value={base} onFocus={e=>e.currentTarget.select()}/>
     <div className="bs-share-buttons">
      <button type="button" className="bs-primary" onClick={()=>void copy(base)}>نسخ رابط الحجز</button>
      <button type="button" onClick={()=>void share()}>مشاركة من الهاتف</button>
      <button type="button" onClick={()=>window.print()}>طباعة لوحة QR</button>
      <a href="/demo/beger-salon-customer-qr.svg" download="beger-salon-demo-booking-qr.svg">حفظ رمز QR</a>
     </div>
     {notice?<p role="status" className="bs-notice">{notice}</p>:null}
    </section>
    <section className="bs-panel"><h2>وين مننشر الرابط؟</h2>
     <div className="bs-share-channel"><strong>WhatsApp</strong><p>أرسل رابطاً مع نص حجز جاهز لزبائن الصالون.</p><a href={"https://wa.me/?text="+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">مشاركة على WhatsApp</a></div>
     <div className="bs-share-channel"><strong>Instagram / TikTok</strong><p>انسخ رابط السوشيال وضعه في البايو أو صفحة الروابط. تفعيل زر «احجز الآن» الرسمي يتبع أهلية حساب المنصة وتكامل الشريك.</p><button type="button" onClick={()=>void copy(sourceLink("instagram"))}>نسخ رابط Instagram</button></div>
     <div className="bs-share-channel"><strong>Facebook / Google Business Profile</strong><p>انسخ الرابط وأضفه كوجهة حجز أو رابط موقع حيث تسمح إعدادات كل منصة؛ تكامل Reserve with Google ليس مفعلاً حالياً.</p><button type="button" onClick={()=>void copy(sourceLink("google"))}>نسخ رابط Google</button></div>
     <div className="bs-share-channel"><strong>باب المحل / المرايا / الكروت</strong><p>اطبع الرمز مباشرة. الرمز عام للحجز، وليس رمز إثبات وصول أو صلاحية إدارية.</p></div>
    </section>
   </div>
  </section>
 </div></main>;
}
