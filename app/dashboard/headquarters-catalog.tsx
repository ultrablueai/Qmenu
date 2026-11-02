"use client";
import {useEffect,useState} from "react";
import MenuManager from "./branches/[branchId]/menu-manager";
import CentralCatalog from "./central-catalog";
import MerchantAppearance from "./merchant-appearance";
import QrSvg from "../../lib/qr/qr-svg";
import QrExport from "../../components/qr-export";
import MerchantTableQr from "./merchant-table-qr";
import MerchantOrderBoard from "./merchant-order-board";
import "../qr-experience.css";

type Branch = {id:string; name:string};
type Props = {businessId:string; country:string; branches:Branch[]};

/** Headquarters-only entry point. The server renders this only for verified
 * business owner/manager memberships; database RLS remains authoritative. */
export default function HeadquartersCatalog({businessId,country,branches}:Props) {
  const [selectedBranch,setSelectedBranch]=useState(branches[0]?.id ?? "");
  const [copyNotice,setCopyNotice]=useState("");
  const [origin,setOrigin]=useState("");
  useEffect(()=>{setOrigin(window.location.origin);},[]);
  if (branches.length===0) return <section id="catalog-management" aria-label="الإدارة المركزية للمنيو">
    <h2>إدارة المنيو والطاولات</h2>
    <p>أضف أول فرع من لوحة الإدارة الرئيسية لتبدأ إعداد قائمته.</p>
  </section>;
  const valid=branches.some(b=>b.id===selectedBranch);
  const activeId=valid?selectedBranch:branches[0].id;
  const guestPath=`/b/${activeId}`;
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
    <div style={{background:"#fff",border:"1px solid #dcebe2",borderRadius:18,padding:20,marginTop:18}}>
      <h3 style={{margin:"0 0 8px",fontSize:20,color:"#193d32"}}>رمز QR للمنيو — جاهز للزبائن</h3>
      <p style={{fontSize:13,color:"#64776c",margin:"0 0 17px",lineHeight:1.8}}>رمز الفرع المحدد يفتح القائمة مباشرةً من دون تسجيل دخول. لا تحتاج إلى إنشاء طاولة للحصول على رمز الفرع العام.</p>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:18}}>
        <div id={"beger-shop-code-"+activeId} style={{background:"#fff",border:"1px solid #e4ece8",padding:12,borderRadius:15,minWidth:198,minHeight:198}}>
          {origin?<QrSvg value={origin+guestPath} size={174} label="QR منيو الزبون للفرع المحدد"/>:<p>جارٍ تجهيز الرابط...</p>}
        </div>
        <div style={{display:"grid",gap:10,flex:"1 1 230px"}}>
          <strong style={{overflowWrap:"anywhere",fontSize:13}}>{origin?origin+guestPath:guestPath}</strong>
          <a href={guestPath} target="_blank" rel="noopener noreferrer" style={{background:"#177657",color:"white",borderRadius:10,padding:"12px 16px",textAlign:"center",fontWeight:750,textDecoration:"none"}}>فتح منيو الزبون ↗</a>
          <button type="button" disabled={!origin} onClick={async()=>{try{await navigator.clipboard.writeText(origin+guestPath);setCopyNotice("تم نسخ رابط المنيو");}catch{setCopyNotice("تعذّر النسخ تلقائياً؛ انسخ الرابط المعروض أعلاه");}}} style={{background:"#eef7f1",color:"#176248",border:"1px solid #d6e8dc",borderRadius:10,padding:"12px 16px",fontWeight:750,cursor:"pointer"}}>نسخ رابط المنيو</button>
          {origin?<QrExport targetId={"beger-shop-code-"+activeId} fileName={"beger-shop-"+activeId} stickerTitle={branches.find(b=>b.id===activeId)?.name??"Beger"} label="حفظ رمز المتجر للطباعة (SVG)"/>:null}
          {copyNotice?<span role="status" style={{fontSize:12,color:"#176248"}}>{copyNotice}</span>:null}
          
        </div>
      </div>
    </div>
    <MerchantTableQr key={activeId} businessId={businessId} branchId={activeId} branchName={branches.find(b=>b.id===activeId)?.name??""}/>
    <MerchantOrderBoard key={"orders-"+activeId} businessId={businessId} branchId={activeId} branchName={branches.find(b=>b.id===activeId)?.name??""}/>
    <MerchantAppearance businessId={businessId}/>
    <CentralCatalog businessId={businessId} country={country} branches={branches}/>
    <details style={{marginTop:22}}><summary style={{cursor:"pointer",fontWeight:700}}>إدارة القوائم القديمة الخاصة بالفرع (مرحلة انتقالية)</summary>
      <p style={{fontSize:13,color:"#60777c"}}>احتفظنا بأدوات الفرع القديمة مؤقتاً حتى لا نفقد أي منتجات أو أسعار أُدخلت قبل اعتماد الكتالوج المركزي. لا تكرر إدخال نفس المنتج في النظامين.</p>
      <MenuManager key={activeId} businessId={businessId} branchId={activeId} country={country}/>
    </details>
  </section>;
}
