import { NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await serverSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Do not imply the user has signed out if Supabase could not end the session.
    return new Response("تعذّر تسجيل الخروج. أعد المحاولة.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
