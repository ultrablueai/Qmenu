import type {ReactNode} from "react";
import BegerBrand from "./beger-brand";
import "../app/beger-marketing.css";
const photo="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=85&fit=crop";
export default function BegerAuthLayout({children,eyebrow="BEGER / QMENU",title="مساحة أعمالك تبدأ هنا"}:{children:ReactNode;eyebrow?:string;title?:string}){
 return <main className="beger-marketing beger-auth-shell">
  <section className="beger-auth-visual" aria-label="تجربة Beger الاحترافية">
   <img src={photo} loading="eager" alt="مقهى بأجواء دافئة" referrerPolicy="no-referrer"/>
   <div className="beger-auth-visual-copy" dir="rtl">
    <small>✦ Beger · Smart Business OS</small>
    <h2>منيو جميل.<br/>إدارة سهلة.<br/>علامة أقوى.</h2>
    <p>كتالوج مركزي، فروع متعددة، قوائم بثلاث لغات وتجربة QR حديثة بهوية كريمية وزيتونية.</p>
   </div>
  </section>
  <section className="beger-auth-side">
   <BegerBrand/>
   <div className="beger-auth-panel">
    <span className="beger-auth-eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    {children}
   </div>
   <p className="beger-auth-bottom">Beger / Qmenu · بيئة تجريبية آمنة · تتم مراجعة الصلاحيات بعد تسجيل الدخول.</p>
  </section>
 </main>;
}
