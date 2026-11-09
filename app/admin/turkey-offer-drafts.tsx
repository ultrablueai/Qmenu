import styles from "./admin.module.css";

export type TurkeyOfferDraft = {
 code:string; name:string; currency:string; monthly_gross_minor:number|string;
 annual_gross_minor:number|string; trial_days:number; included_branches:number;
 promo_monthly_gross_minor:number|string|null; promo_max_merchants:number|null;
 promo_months:number|null; published:boolean; billing_enabled:boolean;
};
function lira(value:number|string){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(Number(value)/100)}
export type FounderDryRunStatus={max_slots:number;used_slots:number;remaining_slots:number;kind:string;billing_enabled:boolean;promo_live:boolean};
export default function TurkeyOfferDrafts({offers,loadFailed,founderStatus,founderStatusFailed}:{offers:TurkeyOfferDraft[];loadFailed:boolean;founderStatus:FounderDryRunStatus|null;founderStatusFailed:boolean}){
 return <section id="turkey-pricing" className={styles.panel} aria-labelledby="turkey-pricing-title">
  <div className={styles.panelHead}><div>
   <h2 id="turkey-pricing-title" className={styles.panelTitle}>باقات Beger تركيا — اعتماد مبدئي</h2>
   <p className={styles.panelDesc}>أسعار شاملة KDV المفترض، محفوظة داخلياً وغير منشورة. لا بيع أو دفع أو اشتراك مفعّل.</p>
  </div><span className={styles.panelCount}>G27 · Staging</span></div>
  {loadFailed?<p role="alert" className={styles.error}>لم نتمكن من التحقق من الأسعار المعتمدة على Staging؛ لا توجد أرقام بديلة.</p>:
  offers.length!==3?<p role="alert" className={styles.error}>كتالوج الأسعار غير مكتمل؛ عرض الباقات متوقف حتى التحقق.</p>:
  <div className={styles.tableWrap}><table className={styles.table}>
   <thead><tr><th>الباقة</th><th>شهري شامل الضريبة</th><th>سنوي شامل الضريبة</th><th>الفروع</th><th>التجربة</th><th>العرض التأسيسي</th><th>حالة البيع</th></tr></thead>
   <tbody>{offers.map(o=><tr key={o.code}>
    <td><strong>{o.name}</strong></td><td>{lira(o.monthly_gross_minor)}</td><td>{lira(o.annual_gross_minor)}</td>
    <td>{o.included_branches}</td><td>{o.trial_days} يوم</td>
    <td>{o.promo_monthly_gross_minor!=null?`${lira(o.promo_monthly_gross_minor)} شهرياً / ${o.promo_months} أشهر / أول ${o.promo_max_merchants} متجر`:"—"}</td>
    <td>{o.published||o.billing_enabled?<span role="alert">يتطلب مراجعة حالة النشر</span>:<span className={styles.noPlan}>مسودة · الدفع معطّل</span>}</td>
   </tr>)}</tbody>
  </table></div>}
  <div role="status" className={styles.panelDesc}>فحص العرض التأسيسي التجريبي: {founderStatusFailed || !founderStatus ? "تعذّر التحقق من السعة التجريبية" : `المقاعد المحجوزة في محاكاة Staging: ${founderStatus.used_slots} / ${founderStatus.max_slots} · المتبقي ${founderStatus.remaining_slots}.`} هذه ليست حجوزات حقيقية، ولا تعني تفعيل خصم أو اشتراك.</div>
  <p className={styles.panelDesc}>مهم: حصة أول 30 متجراً تحتاج تخصيصاً ذرياً على الخادم قبل البيع. لا تُحسب الحجوزات أو الفوترة تلقائياً من هذا الجدول.</p>
 </section>;
}
