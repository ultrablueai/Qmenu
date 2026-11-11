export type RenewalPreflight={
 mode:"renewal_preflight_only";
 plan:string|null;state:string;action:string;
 ends_at:string|null;grace_ends_at:string|null;
 proposal_monthly_gross_minor:number|null;
 proposal_annual_gross_minor:number|null;
 currency:string;assumed_kdv_basis_points:number|null;
 pending_request:boolean;billing_enabled:false;auto_renewal_enabled:false;
 settlement_verified:false;price_published:false;entitlements_changed:false;data_retained:true;
};
const money=(minor:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(minor/100);
const date=(value:string)=>new Intl.DateTimeFormat("ar",{day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Istanbul"}).format(new Date(value));
export default function MerchantRenewalPreflight({data,error}:{data:RenewalPreflight|null;error:boolean}){
 const safe=!!data&&data.mode==="renewal_preflight_only"&&data.billing_enabled===false&&data.auto_renewal_enabled===false&&data.settlement_verified===false&&data.price_published===false&&data.entitlements_changed===false;
 return <section aria-labelledby="beger-renewal-heading" style={{padding:"16px",background:"#fbfbf8",border:"1px solid #e7e5d9",borderRadius:13,margin:"18px 0"}}>
  <h3 id="beger-renewal-heading" style={{margin:"0 0 8px",fontSize:17}}>التجديد وموعد انتهاء الباقة</h3>
  {!safe||error?<p role="alert" style={{color:"#a34835",fontSize:13}}>تعذّر التحقق من معاينة التجديد. لا يُسمح بأي تجديد تلقائي.</p>:
   <>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,175px),1fr))",gap:10,margin:"14px 0"}}>
     <div><small style={{color:"#778076"}}>نهاية الفترة الحالية</small><p style={{margin:"5px 0",fontWeight:800}}>{data.ends_at?date(data.ends_at):"غير محددة"}</p></div>
     <div><small style={{color:"#778076"}}>نهاية مهلة السماح</small><p style={{margin:"5px 0",fontWeight:800}}>{data.grace_ends_at?date(data.grace_ends_at):"غير منطبقة على التجربة المجانية"}</p></div>
     <div><small style={{color:"#778076"}}>طلب التجديد</small><p style={{margin:"5px 0",fontWeight:800}}>{data.pending_request?"بانتظار المراجعة":"متاح للمراجعة فقط"}</p></div>
    </div>
    {data.plan&&data.proposal_monthly_gross_minor!==null&&data.proposal_annual_gross_minor!==null?
     <p style={{fontSize:13,lineHeight:1.9,color:"#4e6154",margin:"0 0 8px"}}>السعر المقترح لباقة {data.plan.toUpperCase()}: <strong>{money(data.proposal_monthly_gross_minor)}</strong> شهرياً أو <strong>{money(data.proposal_annual_gross_minor)}</strong> سنوياً، شاملة KDV وفق افتراض {data.assumed_kdv_basis_points===null?"غير معتمد":String(data.assumed_kdv_basis_points/100)+"%"}. الأسعار غير منشورة للبيع.</p>:null}
    <p style={{fontSize:12,color:"#766f63",lineHeight:1.8,margin:0}}>التجديد لا يحدث تلقائياً، وليس هناك دفع أو فاتورة أو تفعيل ميزات مدفوعة. من قسم «طلبات الاشتراك» أدناه يمكن لمالك المتجر إرسال طلب تجديد للمراجعة، دون تغيير مدة الاشتراك.</p>
   </>}
 </section>;
}
