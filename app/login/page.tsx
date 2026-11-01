"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserSupabase } from "../../lib/supabase/browser";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: authError } = await browserSupabase().auth.signInWithPassword({email: email.trim(), password});
      if (authError) {
        setError(authError.message.toLowerCase().includes("email not confirmed")
          ? "يرجى تأكيد بريدك الإلكتروني أولاً ثم إعادة المحاولة."
          : "تعذّر تسجيل الدخول. تأكد من البريد وكلمة المرور ثم حاول مجدداً.");
        return;
      }
      if (!data.session) throw new Error("No authenticated session");
      // The dashboard verifies the session and membership server-side.
      // New merchants are routed from there to /onboarding.
      const target = new URLSearchParams(window.location.search).get("next");
      // Only these two fixed internal destinations are allowed, never arbitrary URLs.
      window.location.replace(target === "/admin" ? "/admin" : "/dashboard");
    } catch {
      setError("حدث خطأ في الاتصال. حاول مرة أخرى.");
      setBusy(false);
    } finally { setBusy(false); }
  }
  return <main style={{maxWidth:420, margin:"12vh auto", padding:24}}>
    <h1>تسجيل الدخول إلى بيجر</h1>
    <p>حسابك الإلكتروني يكفي للدخول. إذا لم تنشئ نشاطاً بعد، سننقلك إلى صفحة إعداده تلقائياً.</p>
    <form onSubmit={submit}>
      <label htmlFor="email">البريد الإلكتروني</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:12,marginBottom:16,boxSizing:"border-box"}}/>
      <label htmlFor="password">كلمة المرور</label>
      <input id="password" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",padding:12,marginBottom:16,boxSizing:"border-box"}}/>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy} type="submit">{busy?"جارٍ التحقق...":"دخول"}</button>
    </form>
    <p><Link href="/forgot-password">نسيت كلمة المرور؟ استعد حسابك الحالي</Link></p>
    <p>ليس لديك حساب؟ <Link href="/signup">إنشاء حساب جديد</Link></p>
  </main>;
}
