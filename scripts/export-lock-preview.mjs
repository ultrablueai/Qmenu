// Temporary staging-only transfer of the PUBLIC npm lockfile via build logs.
// Reads ONLY package-lock.json; never environment variables or other files.
// Delete this diagnostic after package-lock.json is committed and certified.
import { readFileSync } from "node:fs";
if (process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== "feat/g1-foundation") {
  throw new Error("Lockfile export is restricted to G1 staging preview");
}
const lock = readFileSync("package-lock.json", "utf8");
const parsed = JSON.parse(lock);
if (parsed.name !== "qmenu" || !parsed.packages?.[""]) throw new Error("Unexpected lockfile");
const compressed = Buffer.from(lock, "utf8").toString("base64");
console.log("QMENU_LOCK_V1_BEGIN", lock.length, compressed.length);
for (let i=0; i<compressed.length; i+=900) {
  console.log("QMENU_LOCK_CHUNK", String(i/900).padStart(4,"0"), compressed.slice(i,i+900));
}
console.log("QMENU_LOCK_V1_END");
