import type { ReactNode } from "react";
export const metadata = { title: "Beger | Smart Business OS", description: "Business operations, simplified." };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="ar" dir="rtl"><body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#172033" }}>{children}</body></html>; }
