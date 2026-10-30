import { redirect } from "next/navigation";
import { serverSupabase } from "../../lib/supabase/server";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for first-business onboarding.
 * Never trust client-supplied business IDs or role claims.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  // Existing members cannot repeat first-business onboarding. The RPC also
  // enforces this check atomically, so this redirect is only a UX guard.
  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1);
  if (membershipError) {
    // Fail closed rather than displaying an onboarding form before authorization
    // data is available (for example before staging migrations are applied).
    throw new Error("Unable to verify onboarding eligibility");
  }
  if (memberships?.length) redirect("/dashboard");

  return <>{children}</>;
}
