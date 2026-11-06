import Link from "next/link";
export default function BegerBrand({href="/"}:{href?:string}){return <Link href={href} className="beger-marketing-brand" aria-label="Beger Qmenu"><span className="beger-brand-mark" aria-hidden="true">B</span><span>Beger</span><span className="beger-brand-divider" aria-hidden="true"/><span className="beger-brand-qmenu">Qmenu</span></Link>;}
