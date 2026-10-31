"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserSupabase } from "../../lib/supabase/browser";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password.length < 12 || password !== confirm) {
      setNotice("يجب أن تتطابق كلمتا المرور وأن تحتوي الكلمة على 12 حرفاً على الأقل.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const client = browserSupabase();
      const { data: { user }, error: sessionError } = await client.auth.getUser();
      if (sessionError || !user) {
        setNotice("رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.");
        return;
      }
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      setPassword("");
      setConfirm("");
      setDone(true);
      setNotice("تم تحديث كلمة المرور. سجّل الدخول بكلمتك الجديدة.");
    } catch {
      setNotice("تعذّر تحديث كلمة المرور. حاول مرة أخرى أو اطلب رابطاً جديداً.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{maxWidth:440,margin:"10vh auto",padding:24}}>
    <h1>تعيين كلمة مرور جديدة</h1>
    <p>استخدم رابط الاستعادة الذي وصل إلى بريدك الإلكتروني.</p>
    {!done && <form onSubmit={submit}>
      <label htmlFor="password">كلمة المرور الجديدة (12 حرفاً على الأقل)</label>
      <input id="password" type="password" autoComplete="new-password" minLength={12} required value={password}
        onChange={e=>setPassword(e.target.value)}
        style={{display:"block",width:"100%",padding:12,margin:"8px 0 16px",boxSizing:"border-box"}} />
      <label htmlFor="confirm">تأكيد كلمة المرور الجديدة</label>
      <input id="confirm" type="password" autoComplete="new-password" minLength={12} required value={confirm}
        onChange={e=>setConfirm(e.target.value)}
        style={{display:"block",width:"100%",padding:12,margin:"8px 0 16px",boxSizing:"border-box"}} />
      <button disabled={busy} type="submit">{busy?"جارٍ الحفظ...":"حفظ كلمة المرور"}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
    <p>{done ? <Link href="/login">تسجيل الدخول</Link> : <Link href="/forgot-password">طلب رابط استعادة جديد</Link>}</p>
  </main>;
}
