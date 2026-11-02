import {notFound} from "next/navigation";
import {anonymousBeger,loadPublicMenu,safeLanguage,type G2Branch} from "../../../lib/g2-public";
import PublicMenu from "../../../components/public-menu";
export const dynamic="force-dynamic";
export const metadata={title:"Beger | Table Menu",robots:{index:false,follow:false}};
type Props={params:Promise<{token:string}>;searchParams:Promise<{lang?:string}>};
type Locator=G2Branch&{table_label:string};
export default async function PublicTable({params,searchParams}:Props){
  const [{token},search]=await Promise.all([params,searchParams]);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))notFound();
  const {data,error}=await anonymousBeger().rpc("public_table_locator",{p_token:token});
  if(error)throw new Error("Table locator unavailable");
  const t=(data?.[0]??null) as Locator|null;
  if(!t)notFound();
  const categories=await loadPublicMenu(t.branch_id);
  return <PublicMenu branch={t} categories={categories} lang={safeLanguage(search.lang)} tableLabel={t.table_label} tableToken={token}/>;
}
