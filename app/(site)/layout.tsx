import type { ReactNode } from "react";
import { BackToTop } from "@/components/BackToTop";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/** The site's pages: header, content, footer. (The booking page has its own full-screen layout.) */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {/* Entrance animations start off to the side; clip them here (not on <body>,
          whose overflow passes to the viewport and would still allow sideways scroll). */}
      <main id="main" className="flex-1 overflow-x-clip">
        {children}
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
