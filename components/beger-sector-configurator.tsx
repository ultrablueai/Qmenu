"use client";
import {useState} from "react";
import {capabilities,previewPlan,sectorById,sectors,type BusinessSector,type Capability} from "../lib/beger-sector-catalog";

export default function BegerSectorConfigurator({onSelectionChange}:{onSelectionChange?:(sector:BusinessSector,features:Capability[])=>void}){
 const [sector,setSector]=useState<BusinessSector>("cafe");
 const [chosen,setChosen]=useState<Capability[]>(sectorById("cafe").defaultCapabilities);
 const definition=sectorById(sector),plan=previewPlan(sector,chosen);
 function selectSector(next:BusinessSector){
  const defaults=sectorById(next).defaultCapabilities;
  setSector(next);setChosen(defaults);onSelectionChange?.(next,defaults);
 }
 function changeCapability(id:Capability,checked:boolean){
  const next=checked?[...chosen,id]:chosen.filter(x=>x!==id);
  const sanitized=previewPlan(sector,next).enabled;
  setChosen(sanitized);onSelectionChange?.(sector,sanitized);
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
   <p>التسعير والدفع والاشتراك حسب الميزات غير مفعّلين بعد. الاختيارات هنا معاينة للنموذج وليست اشتراكاً مدفوعاً أو تفعيل صلاحيات.</p>
  </div>
 </section>;
}
