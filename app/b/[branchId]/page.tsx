import {notFound} from "next/navigation";
import {anonymousBeger,loadPublicMenu,safeLanguage,type G2Branch} from "../../../lib/g2-public";
import PublicMenu from "../../../components/public-menu";
export const dynamic="force-dynamic";
export const metadata={title:"Beger | Digital Menu",robots:{index:false,follow:false}};
type Props={params:Promise<{branchId:string}>;searchParams:Promise<{lang?:string}>};
export default async function PublicBranch({params,searchParams}:Props){
  const [{branchId},search]=await Promise.all([params,searchParams]);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId))notFound();
  const {data,error}=await anonymousBeger().rpc("public_branch_identity",{p_branch:branchId});
  if(error)throw new Error("Public branch lookup unavailable");
  const branch=(data?.[0]??null) as G2Branch|null;
  if(!branch)notFound();
  const categories=await loadPublicMenu(branchId);
  return <PublicMenu branch={branch} categories={categories} lang={safeLanguage(search.lang)}/>;
}
