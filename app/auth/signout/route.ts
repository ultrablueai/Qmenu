import { NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/supabase/server";
export async function POST(request: Request) {
  const supabase = await serverSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
