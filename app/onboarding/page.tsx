import { redirect } from "next/navigation";
import { serverSupabase } from "../../lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    return <main style={{maxWidth:520, margin:"8vh auto", padding:24}}>
      <h1>تعذّر فتح إعداد التاجر</h1>
      <p role="alert">لم نتمكّن من التحقق من عضوية حسابك. جرّب إعادة تحميل الصفحة.</p>
    </main>;
  }
  if (memberships?.length) redirect("/dashboard");
  return <OnboardingForm />;
}
