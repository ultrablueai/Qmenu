"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserSupabase } from "../../lib/supabase/browser";
import styles from "./dashboard.module.css";

type Branch = { id: string; name: string };
type Props = { businessId: string; branches: Branch[]; canManage: boolean };

function errorMessage(message: string) {
  if (/permission|policy|denied|row-level security|42501/i.test(message))
    return "ليس لديك صلاحية لإجراء هذا التغيير على الفرع.";
  return "تعذّر حفظ التغيير. تحقّق من اتصالك وحاول مجدداً.";
}

export default function BranchManager({ businessId, branches, canManage }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function addBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = name.trim();
    if (!canManage || busy || !clean || clean.length > 160) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { error: insertError } = await browserSupabase().from("branches").insert({
        business_id: businessId,
        name: clean
      });
      if (insertError) throw insertError;
      setName("");
      setNotice("تمت إضافة الفرع بنجاح.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function renameBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = editName.trim();
    if (!canManage || busy || !editing || !branches.some(b => b.id === editing) || !clean || clean.length > 160) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const { data, error: updateError } = await browserSupabase()
        .from("branches")
        .update({ name: clean })
        .eq("id", editing)
        .eq("business_id", businessId)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error("permission denied");
      setEditing(null);
      setEditName("");
      setNotice("تم تحديث اسم الفرع.");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.branchManager}>
    {branches.length > 0 && canManage && <div className={styles.branchEditList}>
      {branches.map((branch) => <div className={styles.branchEditRow} key={branch.id}>
        {editing === branch.id ?
          <form onSubmit={renameBranch} className={styles.inlineForm}>
            <label className={styles.srOnly} htmlFor="edit-branch-name">اسم الفرع الجديد</label>
            <input id="edit-branch-name" className={styles.field} minLength={1} maxLength={160} required
              value={editName} onChange={e=>setEditName(e.target.value)} autoComplete="off" disabled={busy} />
            <button type="submit" className={styles.smallAction} disabled={busy || !editName.trim()}>حفظ</button>
            <button type="button" className={styles.ghostAction} disabled={busy} onClick={()=>setEditing(null)}>إلغاء</button>
          </form> :
          <>
            <span className={styles.branchEditName}>{branch.name}</span>
            <button type="button" className={styles.ghostAction} disabled={busy}
              onClick={()=>{setEditing(branch.id);setEditName(branch.name);setError("");setNotice("");}}>
              تعديل الاسم
            </button>
          </>
        }
      </div>)}
    </div>}
    {canManage ? <form className={styles.branchAddForm} onSubmit={addBranch}>
      <label className={styles.formLabel} htmlFor="new-branch-name">إضافة فرع جديد</label>
      <div className={styles.inlineForm}>
        <input id="new-branch-name" className={styles.field} value={name}
          onChange={e=>setName(e.target.value)} maxLength={160} minLength={1} required
          autoComplete="off" placeholder="مثلاً: فرع المركز" disabled={busy} />
        <button type="submit" className={styles.primaryAction} disabled={busy || !name.trim()}>
          {busy ? "جارٍ الحفظ..." : "+ إضافة فرع"}
        </button>
      </div>
      <p className={styles.formHelp}>يمكنك إضافة الفروع وتعديل أسمائها. حذف الفروع غير متاح حالياً.</p>
    </form> :
      <p className={styles.formHelp}>إدارة الفروع متاحة لمالك النشاط والمدير فقط.</p>}
    {error && <p className={styles.formError} role="alert">{error}</p>}
    {notice && <p className={styles.formSuccess} role="status">{notice}</p>}
  </div>;
}
