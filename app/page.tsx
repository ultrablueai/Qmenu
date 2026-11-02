import Link from "next/link";

export default function Home() {
  return <main style={{maxWidth:760,margin:"10vh auto",padding:24}}>
    <p style={{color:"#64748b"}}>Qmenu · Smart Business OS</p>
    <h1>منصة الأعمال الذكية</h1>
    <p>النسخة التأسيسية قيد التطوير والاختبار. تشغيل التجار الفعلي غير متاح بعد.</p>
    <nav aria-label="حساب التاجر" style={{display:"flex",gap:18,flexWrap:"wrap"}}>
      <Link href="/signup">إنشاء حساب تجريبي</Link>
      <Link href="/login">تسجيل دخول التاجر</Link>
    </nav>
    <p style={{marginTop:32,fontSize:14,color:"#64748b"}}>G1 — Staging verification pending. Not production certified.</p>
  </main>;
}
