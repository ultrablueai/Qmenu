import { redirect } from "next/navigation";
import { serverSupabase } from "../../lib/supabase/server";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/**
 * A server-enforced auth boundary. Client checks are UX only, never a security gate.
 * Database writes remain restricted to the create_first_business RPC.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await serverSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return <>{children}</>;
}
