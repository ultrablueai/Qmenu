"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
import "./merchant-loyalty.css";

type Status={enabled:boolean;target:number;wallets:number;stamps:number};
export default function MerchantLoyalty({branchId,branchName}:{branchId:string;branchName:string}){
 const [status,setStatus]=useState<Status|null>(null);
 const [enabled,setEnabled]=useState(false),[target,setTarget]=useState(5);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  let live=true;setLoading(true);setError("");setStatus(null);
  Promise.resolve(browserSupabase().rpc("g5_loyalty_merchant_status",{p_branch:branchId}))
   .then(({data,error})=>{
    if(!live)return;
    if(error||!data||typeof data.target!=="number")throw Error("Loyalty unavailable");
    const result=data as Status;setStatus(result);setEnabled(result.enabled);setTarget(result.target);
   }).catch(()=>{if(live)setError("تعذّر تحميل إعدادات الولاء. تحقق من صلاحيات إدارة الفرع.")})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[branchId,refreshKey]);
 async function save(){
  if(busy||loading||!status||target<3||target>20)return;
  if(enabled&&!status.enabled&&!window.confirm("تفعيل أختام الولاء لهذا الفرع فقط؟ الأختام تجريبية ولا تمنح خصماً أو مكافأة تلقائياً."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g5_loyalty_configure",{p_branch:branchId,p_enabled:enabled,p_target:target});
   if(error||!data)throw Error("Unable to save");
   setStatus(previous=>previous?{...previous,enabled,target}:null);
   setNotice("تم حفظ برنامج الأختام لهذا الفرع. لا توجد مكافآت أو خصومات قابلة للصرف بعد.");
  }catch{setError("تعذّر حفظ إعدادات الأختام. تحقق من الاتصال والصلاحيات.");}
  finally{setBusy(false);}
 }
 return <section className="beger-loyalty-workspace" dir="rtl" aria-label="الولاء والمكافآت">
  <div className="beger-loyalty-heading"><div><span>BEGER · CUSTOMER LOYALTY</span><h3>بطاقة الأختام الرقمية</h3><p>{branchName} · ختم واحد لكل طلب تم تسليمه ويختار الزبون الاحتفاظ به</p></div>
   <button type="button" disabled={loading||busy} onClick={()=>setRefreshKey(n=>n+1)}>تحديث ↻</button>
  </div>
  {loading?<p role="status">جارٍ تحميل إعدادات الولاء…</p>:null}
  {error?<p role="alert" className="beger-loyalty-error">{error}</p>:null}
  {status?<div className="beger-loyalty-columns">
   <section className="beger-loyalty-configuration" aria-label="إعدادات البطاقة">
    <h4>إعداد برنامج الولاء</h4>
    <label className="beger-loyalty-toggle"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>setEnabled(e.target.checked)}/><span>تمكين جمع الأختام في هذا الفرع</span></label>
    <label className="beger-loyalty-target">عدد الأختام المستهدف
     <select value={target} disabled={busy} onChange={e=>setTarget(Number(e.target.value))}>
      {[3,4,5,6,7,8,9,10,12,15,20].map(n=><option key={n} value={n}>{n} أختام</option>)}
     </select>
    </label>
    <p className="beger-loyalty-explanation">الزبون لا يحتاج اسماً أو هاتفاً. تُحفظ بطاقة عشوائية على هذا المتصفح، وقد يفقدها إذا مسح بياناته أو انتقل لجهاز آخر. الوصول إلى الهدف لا يصدر قسيمة ولا يخصم من الطلب.</p>
    <button type="button" onClick={()=>void save()} disabled={busy||loading}>{busy?"جارٍ الحفظ…":"حفظ إعدادات الولاء"}</button>
    {notice?<p role="status" className="beger-loyalty-success">{notice}</p>:null}
   </section>
   <section className="beger-loyalty-configuration" aria-label="بيانات الولاء">
    <h4>ملخص الأختام الفعلية</h4>
    <div className="beger-loyalty-stats"><article><span>البطاقات المنشأة</span><strong>{status.wallets}</strong></article><article><span>الأختام المسجّلة</span><strong>{status.stamps}</strong></article></div>
    <p className="beger-loyalty-explanation">الأرقام تخص هذا الفرع فقط. لا تُحتسب الطلبات غير المكتملة ولا يتم إضافة ختم تلقائياً دون اختيار الزبون.</p>
   </section>
  </div>:null}
 </section>;
}
