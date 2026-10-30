import { NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/supabase/server";

// Public liveness probe: no credentials, user data or internal error details.
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json(
      { status: "unconfigured", service: "qmenu" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const client = await serverSupabase();
    const { error } = await client.auth.getSession();
    if (error) throw new Error("auth unavailable");
    return NextResponse.json(
      { status: "app_ready", service: "qmenu", databaseVerified: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", service: "qmenu" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
