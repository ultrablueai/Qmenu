"use client";
import {useEffect,useState} from "react";
import {browserSupabase} from "../lib/supabase/browser";
import {capabilities,previewPlan,sectorById,sectors,type BusinessSector,type Capability} from "../lib/beger-sector-catalog";

export default function BegerSectorConfigurator({onSelectionChange,draftKey,businessId,canSave=false}:{onSelectionChange?:(sector:BusinessSector,features:Capability[])=>void;draftKey?:string;businessId?:string;canSave?:boolean}){
 const [sector,setSector]=useState<BusinessSector>("cafe");
 const [chosen,setChosen]=useState<Capability[]>(sectorById("cafe").defaultCapabilities);
 const [loaded,setLoaded]=useState(false);
 const [saving,setSaving]=useState(false);
 const [synced,setSynced]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{try{if(draftKey){const raw=localStorage.getItem("beger-sector-draft:"+draftKey);if(raw){const saved=JSON.parse(raw) as {sector?:BusinessSector;features?:string[]};if(sectors.some(x=>x.id===saved.sector)&&Array.isArray(saved.features)){const valid=previewPlan(saved.sector!,saved.features).enabled;setSector(saved.sector!);setChosen(valid);onSelectionChange?.(saved.sector!,valid);}}}}catch{/* local drafts optional */}setLoaded(true);},[draftKey]);
 useEffect(()=>{if(!loaded||!draftKey)return;try{localStorage.setItem("beger-sector-draft:"+draftKey,JSON.stringify({sector,features:chosen}))}catch{/* local drafts optional */}},[sector,chosen,loaded,draftKey]);
 useEffect(()=>{if(!businessId)return;let alive=true;const db=browserSupabase();
  void db.from("beger_merchant_model_preferences").select("sector,requested_capabilities").eq("business_id",businessId).maybeSingle().then(({data,error})=>{
   if(!alive)return;
   if(error){setNotice("تعذّر قراءة الإعدادات المحفوظة من الخادم؛ المعروض مسودة محلية.");return;}
   if(data&&sectors.some(x=>x.id===data.sector)){
    const next=data.sector as BusinessSector,features=previewPlan(next,Array.isArray(data.requested_capabilities)?data.requested_capabilities:[]).enabled;
    setSector(next);setChosen(features);onSelectionChange?.(next,features);setSynced(true);
   }
  });
  return()=>{alive=false};
 },[businessId]);
 async function save(){
  if(!businessId||!canSave||saving)return;
  setSaving(true);setNotice("");
  try{
   const db=browserSupabase();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw new Error("Session missing");
   const {error}=await db.from("beger_merchant_model_preferences").upsert({
    business_id:businessId,sector,requested_capabilities:previewPlan(sector,chosen).enabled,
    updated_by:user.id,updated_at:new Date().toISOString()
   },{onConflict:"business_id"});
   if(error)throw error;
   setSynced(true);setNotice("تم حفظ نموذج النشاط والميزات المطلوبة في مساحة عملك. الميزات قيد التطوير والاشتراكات المدفوعة لا تُفعّل تلقائياً.");
  }catch{setNotice("تعذّر حفظ الاختيارات على الخادم. تحقّق من اتصالك وصلاحية المالك؛ المسودة المحلية لا تفعّل ميزات.");}
  finally{setSaving(false)}
 }
 const definition=sectorById(sector),plan=previewPlan(sector,chosen);
 function selectSector(next:BusinessSector){
  const defaults=sectorById(next).defaultCapabilities;
  setSector(next);setChosen(defaults);setSynced(false);onSelectionChange?.(next,defaults);
 }
 function changeCapability(id:Capability,checked:boolean){
  const next=checked?[...chosen,id]:chosen.filter(x=>x!==id);
  const sanitized=previewPlan(sector,next).enabled;
  setChosen(sanitized);setSynced(false);onSelectionChange?.(sector,sanitized);
 }
 return <section className="beger-sector-picker" aria-labelledby="beger-sector-heading">
  <div className="beger-sector-picker-head"><span>BEGER · BUSINESS MODEL</span><h2 id="beger-sector-heading">اختَر نموذج عملك وميزاته</h2><p>نفس نظام Beger يتكيف مع طبيعة نشاطك. اختر الخدمات التي تريدها، وسنوضح الجاهز للتجربة وما يحتاج تطويراً قبل تفعيله.</p></div>
  <label htmlFor="beger-sector-select">نوع النشاط التجاري</label>
  <select id="beger-sector-select" value={sector} onChange={e=>selectSector(e.target.value as BusinessSector)}>
   {sectors.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}
  </select>
  <p className="beger-sector-explanation">{definition.description}</p>
  <fieldset><legend>الميزات المناسبة لنشاطك</legend>
   <div className="beger-sector-feature-grid">{definition.availableCapabilities.map(id=><label className="beger-sector-feature" key={id}>
    <input type="checkbox" checked={chosen.includes(id)} onChange={e=>changeCapability(id,e.target.checked)}/>
    <span><strong>{capabilities[id].name}</strong><small>{capabilities[id].description}</small></span>
    <em className={capabilities[id].availability==="pilot"?"is-pilot":"is-planned"}>{capabilities[id].availability==="pilot"?"تجريبي":"قيد التطوير"}</em>
   </label>)}</div>
  </fieldset>
  <div className="beger-sector-summary" role="status"><strong>{plan.enabled.length} ميزات مختارة</strong>
   <span>{plan.pilot.length} جاهزة للتجربة · {plan.planned.length} مخطط لها</span>
   <p>التسعير والدفع والاشتراك حسب الميزات غير مفعّلين بعد. {synced?"الاختيارات محفوظة في مساحة عملك كمقترح فقط.":"الاختيارات الحالية مسودة حتى تضغط حفظ."} اختيار ميزة لا يمنح صلاحية تشغيلها.</p>
  </div>
  {businessId&&canSave?<button type="button" className="beger-sector-save" disabled={saving} onClick={()=>void save()}>{saving?"جارٍ الحفظ...":"حفظ نموذج النشاط والميزات المطلوبة"}</button>:null}
  {businessId&&!canSave?<p className="beger-sector-readonly">حفظ إعدادات النشاط متاح لمالك النشاط فقط.</p>:null}
  {notice?<p role="status" className="beger-sector-notice">{notice}</p>:null}
 </section>;
}
