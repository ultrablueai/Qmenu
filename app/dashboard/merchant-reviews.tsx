"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-reviews.css";

type Review={id:string;stars:number;comment:string|null;createdAt:string;reference:string};
type Summary={count:number;average:number|null;distribution:Record<string,number>;recent:Review[]};
export default function MerchantReviews({branchId,branchName}:{branchId:string;branchName:string}){
 const [report,setReport]=useState<Summary|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let live=true;
  setLoading(true);setError("");setReport(null);
  browserSupabase().rpc("g5_branch_ratings",{p_branch:branchId})
   .then(({data,error})=>{if(!live)return;if(error||!data||!Array.isArray(data.recent))throw Error("Bad rating report");setReport(data as Summary)})
   .catch(()=>{if(live)setError("تعذّر جلب التقييمات. تحقق من صلاحيات مدير الفرع.")})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[branchId,revision]);
 return <section className="beger-review-workspace" dir="rtl" aria-label="تقييمات الطلبات">
  <header className="beger-review-heading"><div><span>BEGER · VERIFIED FEEDBACK</span><h3>تقييمات الطلبات</h3><p>{branchName} · تقييم واحد لكل طلب تم تسليمه · التعليقات خاصة بإدارة المتجر</p></div><button type="button" disabled={loading} onClick={()=>setRevision(n=>n+1)}>تحديث ↻</button></header>
  {loading?<p role="status">جارٍ تحميل التقييمات…</p>:null}
  {error?<p role="alert" className="beger-review-error">{error}</p>:null}
  {report?<div className="beger-review-data">
   <section className="beger-review-summary" aria-label="ملخص التقييمات">
    <div><strong>{report.average===null?"—":Number(report.average).toFixed(1)}</strong><span aria-label="متوسط التقييم من خمس نجوم">★ / 5</span><small>{report.count} تقييم موثّق</small></div>
    <div className="beger-review-distribution">{[5,4,3,2,1].map(star=><div className="beger-review-bar" key={star}>
     <span>{star} ★</span><div role="img" aria-label={star+" نجوم: "+(report.distribution[String(star)]??0)+" تقييم"}><i style={{width:report.count?((report.distribution[String(star)]??0)/report.count*100)+"%":"0%"}} /></div><small>{report.distribution[String(star)]??0}</small>
    </div>)}</div>
   </section>
   <section className="beger-review-recent" aria-label="التعليقات الخاصة بالمتجر">
    <h4>آخر التعليقات</h4>
    {!report.recent.length?<p>لا توجد تقييمات مؤكدة بعد. تظهر التقييمات بعد تسليم طلب حقيقي.</p>:null}
    {report.recent.map(review=><article key={review.id} className="beger-review-entry">
     <div><strong>{"★".repeat(review.stars)}<span>{"☆".repeat(5-review.stars)}</span></strong><small>طلب #{review.reference} · {new Date(review.createdAt).toLocaleDateString("ar")}</small></div>
     <p>{review.comment||"تقييم بالنجوم دون تعليق."}</p>
    </article>)}
   </section>
  </div>:null}
  <p className="beger-review-disclaimer">هذه تقييمات مرتبطة بطلبات مكتملة فقط. لا ننشر التعليقات أو معلومات الطلب للعامة في هذه المرحلة، ولا نعرض تقييمات أو أرقاماً وهمية.</p>
 </section>;
}
