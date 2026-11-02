import Link from "next/link";
import s from "./hq-reference-overview.module.css";

type Branch={id:string;name:string};
type Props={businessName:string;userLabel:string;businessCount:number;branches:Branch[];loadError:boolean};
const empty="—";
export default function HqReferenceOverview({businessName,userLabel,businessCount,branches,loadError}:Props){
 const stats=[
  {icon:"▣",name:"Businesses",value:loadError?empty:String(businessCount),sub:"Your accessible businesses"},
  {icon:"♧",name:"Branches",value:loadError?empty:String(branches.length),sub:"Current business"},
  {icon:"◈",name:"Products",value:empty,sub:"Open central catalog"},
  {icon:"▢",name:"Orders",value:empty,sub:"Not active in this phase"},
  {icon:"☆",name:"Rating",value:empty,sub:"No verified ratings"},
  {icon:"◉",name:"Theme Preview",value:"Olive / Cream",sub:"Visual reference, not verified saved setting"}
 ];
 return <section className={s.root} aria-label="Beger HQ dashboard reference layout" dir="ltr">
  <header className={s.top}>
   <div><span className={s.eyebrow}>BEGER <b>/ Qmenu HQ</b></span><h2>Welcome to Beger HQ 👋</h2><p>Manage your menu, branches, languages and guest experience from one place.</p></div>
   <span className={s.staging}><span/> Staging · {userLabel}</span>
  </header>
  <div className={s.kpis}>{stats.map(st=><div className={s.kpi} key={st.name}><div className={s.kpiTop}><span className={s.kpiIcon} aria-hidden="true">{st.icon}</span><span>{st.name}</span></div><strong>{st.value}</strong><small>{st.sub}</small></div>)}</div>
  <div className={s.visualGrid}>
   <div className={s.trend}><div className={s.panelHeading}><h3>Orders Trend</h3><span>Pending G3</span></div><div className={s.chartEmpty}><svg viewBox="0 0 400 120" preserveAspectRatio="none" role="img" aria-label="No order trend data yet"><path d="M0 24H400 M0 57H400 M0 90H400" stroke="#e8e0d3" strokeDasharray="4 5" fill="none"/><path d="M0 115H400" stroke="#d8d2c6" fill="none"/></svg><p>No real orders yet. The chart will show verified data after ordering launches.</p></div></div>
   <div className={s.channel}><div className={s.panelHeading}><h3>Orders by Channel</h3></div><div className={s.donutRow}><div className={s.donut}><span>—<small>Orders</small></span></div><p> Dine-in <br/> Takeaway <br/> Delivery <br/> QR Menu</p></div></div>
   <div className={s.topProducts}><div className={s.panelHeading}><h3>Top Products</h3></div><div className={s.emptyProducts}><span aria-hidden="true">☕</span><p>Top products appear after verified orders are enabled.</p></div></div>
  </div>
  <div className={s.banner}><div className={s.bannerCoffee} aria-hidden="true">☕</div><div><h3>One Catalog. All Branches.</h3><p>Create once, manage centrally, publish per branch.</p></div><ul><li>Central catalog and branch pricing</li><li>Arabic · Turkish · English</li><li>Three premium menu themes</li><li>Table QR menus and customization</li></ul></div>
  <div className={s.bottomPanels}>
   <section className={s.shortcut}><div className={s.shortcutTop}><span className={s.shortcutIcon}>▤</span><strong>Central Catalog</strong></div><p>Edit products, modifiers, translations and branch pricing.</p><a href="#catalog-management" className={s.action}>Manage Products <span aria-hidden="true">→</span></a></section>
   <section className={s.shortcut}><div className={s.shortcutTop}><span className={s.shortcutIcon}>◉</span><strong>Menu Themes & Languages</strong></div><p>Soft Light · Olive Premium · Warm Editorial</p><a href="#catalog-management" className={s.action}>Open Theme Settings <span aria-hidden="true">→</span></a></section>
   <section className={s.shortcut}><div className={s.shortcutTop}><span className={s.shortcutIcon}>☆</span><strong>Reviews, Loyalty & Offers</strong></div><p>Guest reviews and rewards are planned for a later phase.</p><span className={s.unavailable}>Not active yet</span></section>
  </div>
  <section className={s.branchPanel} aria-labelledby="hq-branches-title"><div className={s.branchHead}><div><h3 id="hq-branches-title">Branch Management</h3><p>{businessName} · Business-controlled branches and QR menus</p></div><a href="#branches" className={s.branchAction}>Manage Branches</a></div>
   <div className={s.branchRows}>{loadError?<p className={s.branchEmpty}>Could not verify branch records.</p>:branches.length===0?<p className={s.branchEmpty}>Add your first branch to start central management.</p>:branches.map(b=><div className={s.branchRow} key={b.id}><div className={s.branchName}><span aria-hidden="true">⌂</span><strong>{b.name}</strong><small>Central catalog</small></div><span className={s.branchStatus}>● Listed</span><Link className={s.qrLink} href={`/b/${b.id}`}>QR Menu ↗</Link><Link className={s.editLink} href={`/dashboard/branches/${b.id}`}>Open branch →</Link></div>)}</div>
  </section>
 </section>;
}
