import { redirect } from "next/navigation";
import Link from "next/link";
import { serverSupabase } from "../../lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships").select("business_id,role").eq("user_id", user.id).limit(10);
  return <main style={{maxWidth:720,margin:"8vh auto",padding:24}}>
    <h1>لوحة التاجر — تجريبية</h1>
    <p>أهلاً {user.email}</p>
    {membershipError ? <p role="alert">تعذر تحميل عضوياتك. قد تكون قاعدة البيانات غير مُهيأة.</p>
      : memberships?.length ? <ul>{memberships.map(m=><li key={m.business_id}>شركة: {m.business_id} — الدور: {m.role}</li>)}</ul>
      : <p>لا توجد شركة مرتبطة بحسابك بعد. <Link href="/onboarding">إعداد نشاطك الأول</Link> (بعد تجهيز قاعدة Staging).</p>}
    <form action="/auth/signout" method="post"><button type="submit">تسجيل الخروج</button></form>
  </main>;
}
