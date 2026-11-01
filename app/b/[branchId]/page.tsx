import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Beger | القائمة الرقمية",
  robots: { index: false, follow: false }
};

type Props = { params: Promise<{ branchId: string }> };
type Identity = { branch_id: string; branch_name: string; business_name: string; country_code: string };

export default async function PublicBranchPage({ params }: Props) {
  const { branchId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId)) notFound();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Staging public configuration");
  // Explicitly anonymous: browser cookies and merchant/admin sessions do not participate.
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "beger-public-branch-g2a" } }
  });
  const { data, error } = await supabase.rpc("public_branch_identity", { p_branch: branchId });
  if (error) throw new Error("Public branch lookup unavailable");
  const branch = (data?.[0] ?? null) as Identity | null;
  if (!branch) notFound();

  const isTr = branch.country_code === "TR";
  return <main dir="rtl" lang="ar" style={{maxWidth:660,margin:"0 auto",padding:"28px 18px 80px",fontFamily:"system-ui",minHeight:"100dvh",background:"#f8fafb",color:"#19313a"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:24,borderBottom:"1px solid #dce7ea"}}>
      <strong style={{fontSize:23,letterSpacing:"-.05em"}}>Beger<span style={{color:"#19958d"}}>.</span></strong>
      <span style={{fontSize:12,color:"#55777b",background:"#edf7f5",padding:"6px 12px",borderRadius:30}}>قائمة عامة · بدون تسجيل</span>
    </header>
    <section style={{padding:"36px 0 26px"}}>
      <p style={{fontSize:12,color:"#36837d",fontWeight:700,marginBottom:10}}>مرحباً بك في</p>
      <h1 style={{fontSize:"clamp(28px,6vw,44px)",margin:"0 0 12px",lineHeight:1.25}}>{branch.business_name}</h1>
      <p style={{fontSize:17,color:"#4a666e",margin:0}}>فرع {branch.branch_name} · {isTr ? "تركيا" : branch.country_code === "SY" ? "سوريا" : branch.country_code}</p>
    </section>
    <section aria-label="حالة القائمة" style={{padding:28,background:"#fff",border:"1px solid #dde9ea",borderRadius:22,boxShadow:"0 10px 28px #18343b0a"}}>
      <span aria-hidden="true" style={{fontSize:34}}>▤</span>
      <h2 style={{fontSize:23,margin:"15px 0 10px"}}>القائمة الرقمية قيد التجهيز</h2>
      <p style={{lineHeight:2,color:"#526b74",margin:0}}>وصلت إلى الفرع الصحيح! لا توجد منتجات أو أسعار منشورة حالياً. قريباً ستشاهد قائمة هذا الفرع هنا مباشرة، دون الحاجة لحساب أو تطبيق.</p>
    </section>
    <footer style={{color:"#73878b",fontSize:12,textAlign:"center",paddingTop:35}}>Beger · Smart Business OS · G2A Preview</footer>
  </main>;
}
