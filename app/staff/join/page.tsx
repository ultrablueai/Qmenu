import Link from "next/link";
export const metadata={title:"بوابة الموظفين | Beger",description:"تسجيل ودخول الموظفين لقبول دعوات الفروع والأدوار"};
export default function StaffJoin(){
 return <main lang="ar" dir="rtl" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"clamp(16px,4vw,40px)",background:"#f7f8f2",color:"#38472f"}}>
  <section style={{maxWidth:570,width:"100%",background:"#fff",padding:"clamp(24px,5vw,42px)",borderRadius:22,border:"1px solid #e1e7d9",boxShadow:"0 10px 40px #34521a0a"}}>
   <span style={{fontSize:12,color:"#67804f",fontWeight:900}}>BEGER · TEAM</span>
   <h1 style={{fontSize:"clamp(25px,5vw,34px)",margin:"12px 0"}}>مرحباً بفريق العمل</h1>
   <p style={{lineHeight:1.8,color:"#6b7166"}}>أرسل لك صاحب النشاط دعوة؟ استخدم <strong>نفس بريدك المدعو</strong> ثم ادخل إلى مساحتك لقبول الدور. لا تحتاج إلى إنشاء متجر أو مشاركة كلمة مرورك مع التاجر.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:12,margin:"22px 0"}}>
    <Link href="/staff/register" style={{display:"grid",gap:6,padding:18,borderRadius:14,background:"#557741",color:"#fff",textDecoration:"none",minHeight:94}}>
     <strong>أول مرة أستخدم Beger</strong><span style={{fontSize:12,opacity:.9}}>إنشاء حساب موظف وتأكيد البريد ←</span>
    </Link>
    <Link href="/login" style={{display:"grid",gap:6,padding:18,borderRadius:14,background:"#f5f8f0",border:"1px solid #dce7d3",color:"#3f6333",textDecoration:"none",minHeight:94}}>
     <strong>عندي حساب بالفعل</strong><span style={{fontSize:12}}>تسجيل الدخول وقبول الدعوة ←</span>
    </Link>
   </div>
   <p style={{fontSize:13,lineHeight:1.8,color:"#756d60"}}>بعد الدخول افتح <Link href="/staff" style={{color:"#466c37",fontWeight:800}}>مساحة الموظف</Link> لتقبل الدعوة. صلاحيات الكاشير والمطبخ والبيجر لا تبدأ إلا بعد قبولها.</p>
   <div style={{borderTop:"1px solid #e7e9e0",marginTop:22,paddingTop:17}}><Link href="/signup" style={{fontSize:12,color:"#746e62"}}>أنا صاحب نشاط، أريد تسجيل متجر ←</Link></div>
  </section>
 </main>;
}
