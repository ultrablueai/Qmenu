import { NextResponse } from "next/server";

// Liveness/configuration probe only; does not claim database connectivity or G1 certification.
export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return NextResponse.json(
    {
      service: "qmenu",
      status: configured ? "configured_unverified" : "unconfigured",
      databaseVerified: false,
      stagingCertified: false,
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
