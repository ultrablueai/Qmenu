"use client";
import {useEffect,useState} from "react";
import MenuManager from "./branches/[branchId]/menu-manager";
import CentralCatalog from "./central-catalog";
import MerchantAppearance from "./merchant-appearance";
import QrSvg from "../../lib/qr/qr-svg";
import QrExport from "../../components/qr-export";
import MerchantTableQr from "./merchant-table-qr";
import MerchantOrderBoard from "./merchant-order-board";
import MerchantReport from "./merchant-report";
import "../qr-experience.css";
import "./merchant-workspace.css";

type Branch={id:string;name:string};
type Props={businessId:string;country:string;branches:Branch[]};
type Workspace="orders"|"reports"|"catalog"|"qr"|"appearance"|"legacy";
const workspaceSections:{id:Workspace;icon:string;name:string;help:string}[]=[
 {id:"orders",icon:"▣",name:"الطلبات والمطبخ",help:"طلبات مباشرة · تحصيل · طباعة"},
 {id:"reports",icon:"▥",name:"التقارير والكاشير",help:"قيمة الطلبات · التحصيل المسجّل · القنوات"},
 {id:"catalog",icon:"▤",name:"المنتجات والكتالوج",help:"الأصناف · الإضافات · الأسعار"},
 {id:"qr",icon:"▦",name:"رموز QR والطاولات",help:"QR المتجر والطاولات"},
 {id:"appearance",icon:"◉",name:"الثيمات واللغات",help:"التصميم · الألوان · اللغات"},
 {id:"legacy",icon:"⚙",name:"الأدوات القديمة",help:"أدوات الانتقال المحفوظة"}
];
/** The merchant chooses a single workspace; no stacked editors or unrelated forms. */
export default function HeadquartersCatalog({businessId,country,branches}:Props){
 const [selectedBranch,setSelectedBranch]=useState(branches[0]?.id??"");
 const [workspace,setWorkspace]=useState<Workspace>("orders");
 const [copyNotice,setCopyNotice]=useState("");
 const [origin,setOrigin]=useState("");
 useEffect(()=>{setOrigin(window.location.origin);},[]);
 useEffect(()=>{
  const showHash=()=>{
   const h=window.location.hash;
   if(h==="#catalog-management"||h==="#central-catalog")setWorkspace("catalog");
   else if(h==="#customer-appearance")setWorkspace("appearance");
   else if(h==="#qr-management")setWorkspace("qr");
   else if(h==="#merchant-orders")setWorkspace("orders");
   else if(h==="#merchant-reports")setWorkspace("reports");
  };
  showHash();window.addEventListener("hashchange",showHash);
  return()=>window.removeEventListener("hashchange",showHash);
 },[]);
 if(!branches.length)return <section id="catalog-management" className="beger-merchant-workspace" dir="rtl"><h2>إدارة المتجر</h2><p>أضف فرعك الأول لتبدأ.</p></section>;
 const valid=branches.some(branch=>branch.id===selectedBranch);
 const activeId=valid?selectedBranch:branches[0].id;
 const activeName=branches.find(branch=>branch.id===activeId)?.name??"";
 const guestPath="/b/"+activeId;
 const current=workspaceSections.find(section=>section.id===workspace)!;
 return <section id="catalog-management" className="beger-merchant-workspace" aria-label="مساحة إدارة المتجر" dir="rtl">
  <header className="beger-merchant-workspace-top">
   <div><span className="beger-merchant-workspace-eyebrow">BEGER / MERCHANT HQ</span><h2>إدارة المتجر</h2><p>كل قسم في مساحة مستقلة. أدوات الطلبات والكتالوج والرموز والمظهر محفوظة.</p></div>
   <label className="beger-workspace-branch-select" htmlFor="headquarters-branch">الفرع النشط
    <select id="headquarters-branch" value={activeId} onChange={event=>setSelectedBranch(event.target.value)}>
     {branches.map(branch=><option value={branch.id} key={branch.id}>{branch.name}</option>)}
    </select>
   </label>
  </header>
  <nav className="beger-workspace-tabs" aria-label="أقسام إدارة المتجر">
   {workspaceSections.map(section=><button type="button" key={section.id} onClick={()=>setWorkspace(section.id)} className={"beger-workspace-tab"+(workspace===section.id?" is-current":"")} aria-current={workspace===section.id?"page":undefined}>
    <span aria-hidden="true" className="beger-workspace-tab-symbol">{section.icon}</span><strong>{section.name}</strong><small>{section.help}</small>
   </button>)}
  </nav>
  <div className="beger-merchant-workspace-card">
   <header className="beger-merchant-workspace-card-header"><div><span>WORKSPACE / {workspace.toUpperCase()}</span><h3>{current.name}</h3><p>{current.help}</p></div><span className="beger-merchant-workspace-branch-chip">{activeName}</span></header>
   {workspace==="qr"?<div id="qr-management">
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

    <MerchantTableQr key={activeId} businessId={businessId} branchId={activeId} branchName={activeName}/>
   </div>:null}
   {workspace==="orders"?<div id="merchant-orders"><MerchantOrderBoard key={"orders-"+activeId} businessId={businessId} branchId={activeId} branchName={activeName}/></div>:null}
   {workspace==="reports"?<div id="merchant-reports"><MerchantReport key={"reports-"+activeId} branchId={activeId} branchName={activeName}/></div>:null}
   {workspace==="appearance"?<div id="customer-appearance"><MerchantAppearance businessId={businessId}/></div>:null}
   {workspace==="catalog"?<div id="central-catalog"><CentralCatalog businessId={businessId} country={country} branches={branches}/></div>:null}
   {workspace==="legacy"?<details open><summary>إدارة القوائم القديمة الخاصة بالفرع (مرحلة انتقالية)</summary><p>احتفظنا بالأدوات القديمة للحفاظ على المنتجات السابقة. لا تدخل المنتج في النظامين معاً.</p><MenuManager key={activeId} businessId={businessId} branchId={activeId} country={country}/></details>:null}
  </div>
 </section>;
}
