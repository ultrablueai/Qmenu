"use client";
import {useState} from "react";
import MenuManager from "./branches/[branchId]/menu-manager";
import CentralCatalog from "./central-catalog";

type Branch = {id:string; name:string};
type Props = {businessId:string; country:string; branches:Branch[]};

/** Headquarters-only entry point. The server renders this only for verified
 * business owner/manager memberships; database RLS remains authoritative. */
export default function HeadquartersCatalog({businessId,country,branches}:Props) {
  const [selectedBranch,setSelectedBranch]=useState(branches[0]?.id ?? "");
  if (branches.length===0) return <section id="catalog-management" aria-label="الإدارة المركزية للمنيو">
    <h2>إدارة المنيو والطاولات</h2>
    <p>أضف أول فرع من لوحة الإدارة الرئيسية لتبدأ إعداد قائمته.</p>
  </section>;
  const valid=branches.some(b=>b.id===selectedBranch);
  const activeId=valid?selectedBranch:branches[0].id;
  return <section id="catalog-management" aria-label="الإدارة المركزية للمنيو" dir="rtl" style={{marginTop:26}}>
    <div style={{background:"#eaf5f3",border:"1px solid #cce3df",padding:18,borderRadius:14}}>
      <h2 style={{fontSize:22,margin:"0 0 8px"}}>إدارة الفروع والمنيو من المركز</h2>
      <p style={{fontSize:13,color:"#386c68",margin:"0 0 16px"}}>هذه الأدوات مخصصة لإدارة المؤسسة. حدد الفرع الذي تريد تعديل قائمته وأسعاره وQR الخاص به. موظفو الفرع لا يملكون صلاحيات إدارة المنيو.</p>
      <label htmlFor="headquarters-branch" style={{fontWeight:700,fontSize:14}}>اختيار الفرع</label>
      <select id="headquarters-branch" value={activeId} onChange={e=>setSelectedBranch(e.target.value)}
        style={{display:"block",marginTop:8,width:"100%",maxWidth:420,padding:"11px",border:"1px solid #a2c4c0",borderRadius:10,background:"white",font:"inherit"}}>
        {branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
      </select>
    </div>
    <CentralCatalog businessId={businessId} country={country} branches={branches}/>
    <details style={{marginTop:22}}><summary style={{cursor:"pointer",fontWeight:700}}>إدارة القوائم القديمة الخاصة بالفرع (مرحلة انتقالية)</summary>
      <p style={{fontSize:13,color:"#60777c"}}>احتفظنا بأدوات الفرع القديمة مؤقتاً حتى لا نفقد أي منتجات أو أسعار أُدخلت قبل اعتماد الكتالوج المركزي. لا تكرر إدخال نفس المنتج في النظامين.</p>
      <MenuManager key={activeId} businessId={businessId} branchId={activeId} country={country}/>
    </details>
  </section>;
}
