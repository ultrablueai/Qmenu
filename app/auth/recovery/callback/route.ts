import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/forgot-password?reset=invalid", request.url));
  const supabase = await serverSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/forgot-password?reset=invalid", request.url));
  return NextResponse.redirect(new URL("/reset-password", request.url));
}
