"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {browserSupabase} from "../../lib/supabase/browser";
import {capabilities} from "../../lib/beger-sector-catalog";
import styles from "./admin.module.css";

export type RateDraft={country:string;rate_key:string;monthly_minor:number|string;updated_at:string};
const rateLabels:Record<string,string>={base:"اشتراك المساحة الأساسية",additional_branch:"كل فرع إضافي",...Object.fromEntries(Object.entries(capabilities).map(([id,c])=>[id,c.name]))};
const allowed=new Set(["base","additional_branch",...Object.keys(capabilities)]);
export default function SubscriptionRateDraftManager({rates,canManage,loadFailed}:{rates:RateDraft[];canManage:boolean;loadFailed:boolean}){
 const router=useRouter();
 const [country,setCountry]=useState<"TR"|"SY">("TR");
 const [feature,setFeature]=useState("qr_catalog");
 const [amount,setAmount]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const currency=country==="TR"?"TRY":"SYP";
 const minorFactor=country==="TR"?100:1;
 const selectedRate=rates.find(x=>x.country===country&&x.rate_key===feature);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!canManage||loadFailed||busy||!allowed.has(feature))return;
  if(!(country==="TR"?/^\d+(?:\.\d{1,2})?$/:/^\d+$/).test(amount))return;
  const [whole,decimal=""]=amount.split(".");
  const result=Number(whole)*minorFactor+(minorFactor===100?Number(decimal.padEnd(2,"0")):0);
  if(!Number.isSafeInteger(result)||result<0||result>10000000000||(minorFactor===1&&decimal!==""))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error:rpcError}=await browserSupabase().rpc("beger_platform_owner_save_rate_draft",{
    p_country:country,p_rate_key:feature,p_monthly_minor:result
   });
   if(rpcError||data!==true)throw Error("Rate not saved");
   setNotice("تم حفظ مسودة السعر فقط. لم تُنشر أسعار ولم يتفعّل أي اشتراك أو تحصيل.");
   setAmount("");router.refresh();
  }catch{setError("تعذّر حفظ المسودة؛ تحقق من صلاحية مالك المنصة وصحة المبلغ.");}
  finally{setBusy(false)}
 }
 return <section id="subscription-rates" className={styles.panel} aria-labelledby="subscription-rates-title">
  <div className={styles.panelHead}><div><h2 id="subscription-rates-title" className={styles.panelTitle}>تسعير الميزات — مسودات داخلية</h2>
   <p className={styles.panelDesc}>هذه أسعار شهرية مقترحة لا يراها التاجر كعرض شراء. لا دفع ولا فواتير ولا منح صلاحيات؛ المراجعة والنشر خطوة مستقلة.</p></div>
   <span className={styles.panelCount}>{rates.length} سعر محفوظ</span>
  </div>
  {loadFailed?<p role="alert" className={styles.error}>تعذّر التحقق من أسعار المنصة؛ التعديل متوقف.</p>:null}
  {canManage&&!loadFailed?<form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,alignItems:"end",marginBottom:18}}>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>الدولة
    <select value={country} disabled={busy} onChange={e=>{setCountry(e.target.value as "TR"|"SY");setAmount("");}} style={{minHeight:42,padding:9,borderRadius:10,border:"1px solid #cad7d3"}}>
     <option value="TR">تركيا · TRY</option><option value="SY">سوريا · SYP</option>
    </select>
   </label>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>الميزة
    <select value={feature} disabled={busy} onChange={e=>{setFeature(e.target.value);setAmount("");}} style={{minHeight:42,padding:9,borderRadius:10,border:"1px solid #cad7d3"}}>
     {Object.entries(rateLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select>
   </label>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:800}}>المبلغ الشهري ({currency})
    <input type="text" dir="ltr" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={country==="TR"?"مثال: 299.00":"مثال: 50000"} required pattern={country==="TR"?"[0-9]+(\\.[0-9]{1,2})?":"[0-9]+"} style={{minHeight:42,padding:9,borderRadius:10,border:"1px solid #cad7d3"}}/>
   </label>
   <button type="submit" disabled={busy||!amount} style={{minHeight:42,background:"#607b49",border:0,borderRadius:10,color:"white",fontWeight:800,cursor:"pointer"}}>{busy?"جارٍ الحفظ...":"حفظ المسودة"}</button>
  </form>:null}
  {selectedRate&&canManage?<p style={{fontSize:12,color:"#6d7b6e"}}>المسودة السابقة للميزة المحددة: {new Intl.NumberFormat("ar",{minimumFractionDigits:country==="TR"?2:0,maximumFractionDigits:country==="TR"?2:0}).format(Number(selectedRate.monthly_minor)/minorFactor)} {currency}</p>:null}
  {notice?<p role="status" style={{color:"#4b703f",fontSize:12}}>{notice}</p>:null}
  {error?<p role="alert" className={styles.error}>{error}</p>:null}
  {!loadFailed&&rates.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>الدولة</th><th>الميزة</th><th>السعر الشهري المسودة</th><th>الحالة</th></tr></thead>
   <tbody>{rates.map(rate=><tr key={rate.country+":"+rate.rate_key}><td>{rate.country}</td><td>{rateLabels[rate.rate_key]??rate.rate_key}</td>
    <td>{new Intl.NumberFormat("ar",{minimumFractionDigits:rate.country==="TR"?2:0,maximumFractionDigits:rate.country==="TR"?2:0}).format(Number(rate.monthly_minor)/(rate.country==="TR"?100:1))} {rate.country==="TR"?"TRY":"SYP"}</td>
    <td>مسودة غير منشورة</td></tr>)}</tbody>
  </table></div>:null}
 </section>;
}
