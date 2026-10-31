"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserSupabase } from "../../lib/supabase/browser";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const callback = new URL("/auth/recovery/callback", window.location.origin);
      const { error } = await browserSupabase().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: callback.toString() }
      );
      if (error) throw error;
      setNotice("إذا كان البريد مسجّلاً، سنرسل رابط استعادة كلمة المرور إليه. راجع البريد غير المرغوب أيضاً.");
    } catch {
      setNotice("تعذّر إرسال طلب الاستعادة حالياً. حاول بعد قليل أو تواصل مع الدعم.");
    } finally {
      setBusy(false);
    }
  }
  return <main style={{maxWidth:440,margin:"10vh auto",padding:24}}>
    <h1>استعادة كلمة المرور</h1>
    <p>أدخل بريد حسابك الحالي في بيجر. لا تحتاج إلى تسجيل حساب جديد.</p>
    <form onSubmit={submit}>
      <label htmlFor="email">البريد الإلكتروني</label>
      <input id="email" type="email" autoComplete="email" required value={email}
        onChange={e=>setEmail(e.target.value)}
        style={{display:"block",width:"100%",padding:12,margin:"8px 0 16px",boxSizing:"border-box"}} />
      <button disabled={busy} type="submit">{busy?"جارٍ الإرسال...":"إرسال رابط الاستعادة"}</button>
    </form>
    {notice && <p role="status">{notice}</p>}
    <p><Link href="/login">العودة لتسجيل الدخول</Link></p>
  </main>;
}
