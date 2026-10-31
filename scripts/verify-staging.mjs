// G1 staging deployment safety gate.
// Do not ship this temporary staging-only policy to a future production app
// without an explicit production release change.
const expected = "https://qandxrcuetwzenlqspez.supabase.co";
const production = "https://fstpxknegaxppjilbnke.supabase.co";

export function validateStagingDeployment(env) {
  const vercel = env.VERCEL === "1";
  if (!vercel) return { ok: true, reason: "local_environment" };

  if (env.VERCEL_ENV !== "preview") {
    return { ok: false, reason: "non_preview_vercel_environment" };
  }
  if (env.VERCEL_GIT_COMMIT_REF !== "feat/g1-foundation") {
    return { ok: false, reason: "unapproved_preview_branch" };
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL === production) {
    return { ok: false, reason: "production_database_forbidden" };
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== expected) {
    return { ok: false, reason: "staging_database_mismatch" };
  }
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_")) {
    return { ok: false, reason: "missing_staging_publishable_key" };
  }
  return { ok: true, reason: "staging_preview_only" };
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const result = validateStagingDeployment(process.env);
  if (!result.ok) {
    console.error("Qmenu staging deployment blocked:", result.reason);
    process.exitCode = 1;
  } else {
    console.log("Qmenu staging deployment gate:", result.reason);
  }
}
