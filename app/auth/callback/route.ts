import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
 const code=request.nextUrl.searchParams.get("code");
 if(!code) return NextResponse.redirect(new URL("/login?confirmation=invalid",request.url));
 const supabase=await serverSupabase();
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error) return NextResponse.redirect(new URL("/login?confirmation=invalid",request.url));
 // Never accept arbitrary destinations from the email link.
 const next = request.nextUrl.searchParams.get("next");
 const destination = next === "/reset-password" ? "/reset-password" : "/dashboard";
 return NextResponse.redirect(new URL(destination,request.url));
}
