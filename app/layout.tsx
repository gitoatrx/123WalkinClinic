import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { BackToTop } from "@/components/BackToTop";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { clinicJsonLd, JsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Virtual Walk-In Clinic in BC | ${site.name}`,
    template: `%s | ${site.name}`,
  },
  description:
    "See a BC doctor online by phone or video. Prescriptions, doctor’s notes, lab and imaging requisitions from 123 Virtual Clinic — $0 with MSP.",
  applicationName: site.name,
  openGraph: { siteName: site.name, locale: "en_CA", type: "website" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#14214a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col bg-white text-slate-800 antialiased">
        <a
          href="#main"
          className="sr-only z-[60] rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {/* Scroll-in animations start hidden; without JavaScript, show everything. */}
        <noscript>
          <style>{"[data-animate]{opacity:1!important;transform:none!important;filter:none!important}"}</style>
        </noscript>
        <Header />
        {/* Entrance animations start off to the side; clip them here (not on <body>,
            whose overflow passes to the viewport and would still allow sideways scroll). */}
        <main id="main" className="flex-1 overflow-x-clip">
          {children}
        </main>
        <Footer />
        <BackToTop />
        <JsonLd data={clinicJsonLd} />
      </body>
    </html>
  );
}
