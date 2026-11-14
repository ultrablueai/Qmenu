"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../../lib/supabase/browser";
type Config={enabled:boolean;token:string|null};
type Stats={issued:number;waiting:number;preparing:number;ready:number;fulfilled:number;cancelled:number;sampledReady:number;averageReadyMinutes:number|null;sampledFulfilled:number;averagePickupMinutes:number|null};
export default function MerchantPagerDisplay({branchId}:{branchId:string}){
 const [config,setConfig]=useState<Config|null>(null),[stats,setStats]=useState<Stats|null>(null);
 const [origin,setOrigin]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  setOrigin(window.location.origin);
  let live=true;setError("");setConfig(null);setStats(null);
  Promise.all([
   browserSupabase().rpc("g6_pager_display_config",{p_branch:branchId,p_action:"read"}),
   browserSupabase().rpc("g6_pager_branch_analytics",{p_branch:branchId})
  ]).then(([a,b])=>{
   if(!live)return;
   if(a.error||b.error||!a.data||!b.data)throw Error("Unable to load pager display");
   setConfig(a.data as Config);setStats(b.data as Stats);
  }).catch(()=>{if(live)setError("تعذّر تحميل شاشة النداء أو الإحصائيات. تحقق من صلاحيات الفرع.")});
  return()=>{live=false};
 },[branchId,revision]);
 async function change(action:"enable"|"disable"|"rotate"){
  if(busy||!config)return;
  if(action==="rotate"&&!window.confirm("سيتم إلغاء صلاحية الرابط السابق لشاشة النداء. هل تريد المتابعة؟"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {data,error}=await browserSupabase().rpc("g6_pager_display_config",{p_branch:branchId,p_action:action});
   if(error||!data)throw Error("Failed");
   setConfig(data as Config);
   setNotice(action==="rotate"?"تم تغيير الرابط السري. استخدم الرابط الجديد للشاشة.":action==="enable"?"تم تشغيل شاشة النداء.":"تم إيقاف شاشة النداء.");
  }catch{setError("تعذّر حفظ إعدادات الشاشة.");}
  finally{setBusy(false)}
 }
 const url=config?.token&&origin?origin+"/pager/display/"+encodeURIComponent(config.token):"";
 const n=(value:number|null|undefined,unit:string)=>typeof value==="number"?value.toFixed(1)+" "+unit:"—";
 return <section className="beger-pager-display-tools" aria-label="شاشة النداء والتقارير">
  <details className="beger-pager-display-settings">
   <summary>شاشة النداء العامة <span>{config?.enabled?"مفعلة":"غير مفعلة"}</span></summary>
   <p>اعرض الأرقام الجاهزة فقط على تلفزيون أو تابلت. لا تظهر الفواتير أو الروابط الخاصة بالزبائن.</p>
   {config?<div className="beger-pager-display-actions">
    <button type="button" disabled={busy} onClick={()=>void change(config.enabled?"disable":"enable")}>{config.enabled?"إيقاف شاشة النداء":"تفعيل شاشة النداء"}</button>
    {config.enabled&&url?<a href={url} target="_blank" rel="noopener noreferrer">فتح الشاشة ↗</a>:null}
    {config.enabled&&url?<button type="button" disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText(url);setNotice("تم نسخ رابط الشاشة.");}catch{setError("تعذّر النسخ. افتح رابط الشاشة من الزر المجاور.");}}}>نسخ الرابط</button>:null}
    {config.token?<button type="button" className="is-secondary" disabled={busy} onClick={()=>void change("rotate")}>تغيير الرابط السري</button>:null}
   </div>:<p>جارٍ تحميل إعدادات الشاشة…</p>}
  </details>
  <details className="beger-pager-display-settings">
   <summary>إحصائيات البيجر <span>آخر 7 أيام</span></summary>
   {stats?<div className="beger-pager-display-metrics">
    {([{label:"أرقام أُصدرت",value:String(stats.issued)},{label:"تم تسليمها",value:String(stats.fulfilled)},
     {label:"أُلغيت",value:String(stats.cancelled)},{label:"متوسط وقت التجهيز",value:n(stats.averageReadyMinutes,"دقيقة")},
     {label:"متوسط وقت الاستلام بعد الجاهزية",value:n(stats.averagePickupMinutes,"دقيقة")}
    ]).map(row=><div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}
    <p>المتوسطات مبنية على {stats.sampledReady} نداء وصل للجاهزية و{stats.sampledFulfilled} نداء تم استلامه. أوقات مسجلة، وليست وعداً بمدة انتظار للزبون.</p>
   </div>:<p>جارٍ تحميل بيانات التشغيل…</p>}
   <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>تحديث الأرقام ↻</button>
  </details>
  {notice?<p className="beger-pager-success" role="status">{notice}</p>:null}
  {error?<p className="beger-pager-error" role="alert">{error}</p>:null}
 </section>;
}
