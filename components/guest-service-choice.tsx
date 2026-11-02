"use client";
import Link from "next/link";
import type {GuestLang} from "../lib/g2-public";
export default function GuestServiceChoice({lang,branchId,mode}:{lang:GuestLang;branchId:string;mode:"browse"|"takeaway"}){
 const t=lang==="ar"?{title:"كيف بدك طلبك؟",dine:"داخل المحل",dineNote:"عند الجلوس امسح QR الموجود على طاولتك، حتى يرتبط طلبك برقمها.",pickup:"سفري / استلام",pickupNote:"كوب بغطاء أو علبة مناسبة؛ تجهيز الطلب السفري قيد الإعداد.",delivery:"توصيل",deliveryNote:"سنضيفه بعد تفعيل العناوين ورسوم التوصيل.",browse:"تصفح القائمة",pilot:"معاينة فقط · لا إرسال طلب"}
 :lang==="tr"?{title:"Siparişinizi nasıl istersiniz?",dine:"Mekânda",dineNote:"Masanıza oturduğunuzda masa QR kodunu tarayın.",pickup:"Paket / Gel-al",pickupNote:"Kapaklı bardak veya uygun kutu; paket siparişi hazırlanıyor.",delivery:"Teslimat",deliveryNote:"Adres ve teslimat ücretleri aktif olunca.",browse:"Menüyü incele",pilot:"Sadece önizleme · sipariş gönderilmez"}
 :{title:"How would you like your order?",dine:"Dine in",dineNote:"Scan the QR at your table to associate your order with its table number.",pickup:"Takeaway / Pickup",pickupNote:"Lidded cups and food boxes; takeaway checkout is being prepared.",delivery:"Delivery",deliveryNote:"Available after addresses and delivery fees are enabled.",browse:"Browse menu",pilot:"Preview only · no order submission"};
 return <section className="beger-service-choice" aria-labelledby="beger-service-title">
 <h3 id="beger-service-title">{t.title}</h3>
 <div className="beger-service-choice-grid">
  <div className="beger-service-choice-card"><span aria-hidden="true">☕</span><strong>{t.dine}</strong><p>{t.dineNote}</p><span className="beger-service-mini-note">{t.browse}</span></div>
  <Link className="beger-service-choice-card beger-service-pickup" href={"/b/"+branchId+"?service=takeaway&view=menu&lang="+lang} aria-current={mode==="takeaway"?"page":undefined}><span aria-hidden="true">🥡</span><strong>{t.pickup}</strong><p>{t.pickupNote}</p><small>{t.pilot}</small></Link>
  <div className="beger-service-choice-card beger-service-disabled" aria-disabled="true"><span aria-hidden="true">🛵</span><strong>{t.delivery}</strong><p>{t.deliveryNote}</p><small>{t.pilot}</small></div>
 </div>
 </section>;
}
