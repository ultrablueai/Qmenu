type EntitlementsPreview = {
 mode:"shadow_preview";plan:string|null;state:string;
 features:Record<string,boolean>;included_branches:number;existing_branches:number;
 over_branch_limit:boolean;enforcement_enabled:false;billing_enabled:false;
 paid_entitlements_verified:false;trial_ends_at:string|null;data_retained:boolean;
};
const labels:Record<string,string>={
 qr_menu:"المنيو وQR",products_addons:"المنتجات والإضافات",
 table_orders:"طلبات الطاولات",takeaway_orders:"طلبات السفري",
 kitchen:"شاشة المطبخ",cashier:"الكاشير",printing:"الطباعة",
 pager:"البيجر والإعلان",advanced_reporting:"التقارير الموسعة"
};
export default function MerchantEntitlementPreview({data,error}:{data:EntitlementsPreview|null;error:boolean}){
 return <section aria-labelledby="beger-entitlements-heading" style={{margin:"18px 0",padding:"17px",border:"1px solid #dbe7e0",borderRadius:14,background:"#f8fbf9"}}>
  <h3 id="beger-entitlements-heading" style={{margin:"0 0 8px",fontSize:17}}>مزايا باقتك — معاينة G33</h3>
  <p style={{fontSize:12,lineHeight:1.9,color:"#5f7268",margin:"0 0 12px"}}>الجدول يوضح الميزات المحسوبة من التجربة الحالية. لن يوقف أي ميزة أو طلب، ولا يفعّل اشتراكاً مدفوعاً.</p>
  {error||!data||data.mode!=="shadow_preview"||data.enforcement_enabled!==false?
   <p role="alert" style={{color:"#a34132"}}>تعذّر التحقق من معاينة الميزات. التشغيل الحالي لم يتغير.</p>:
   <>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"#4b6254",marginBottom:12}}>
     <span>الباقة: <strong>{data.plan?.toUpperCase()??"لم تُحدد"}</strong></span>
     <span>الحالة: <strong>{data.state==="trial"?"تجربة سارية":data.state==="expired"?"منتهية":data.state==="not_configured"?"بدون اشتراك":data.state}</strong></span>
     <span>الفروع: <strong>{data.existing_branches} / {data.included_branches || "—"}</strong></span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:8}}>
     {Object.entries(labels).map(([key,name])=><div key={key} style={{display:"flex",justifyContent:"space-between",gap:9,background:"#fff",borderRadius:9,padding:"10px 12px",border:"1px solid #e3eae5",fontSize:12}}>
      <span>{name}</span><strong style={{color:data.features?.[key]?"#277052":"#8e948b"}}>{data.features?.[key]?"مشمولة":"غير مشمولة"}</strong>
     </div>)}
    </div>
    {data.over_branch_limit?<p role="status" style={{fontSize:12,color:"#926030"}}>عدد الفروع الحالي يتجاوز حد الباقة المقترح. لم يتغير تشغيل الفروع.</p>:null}
    <p style={{fontSize:11,color:"#708078",marginBottom:0}}>الحماية: منع تفعيل ميزات مدفوعة قبل اعتماد الفوترة. لا توجد قيود تشغيلية جديدة، وبيانات المتجر محفوظة.</p>
   </>}
 </section>;
}
export type {EntitlementsPreview};
