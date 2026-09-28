import type { Metadata } from "next";
import type { QA } from "@/lib/pages";
import { site } from "@/lib/site";

/** The indexable pages, for the sitemap. */
export const sitemapPages = [
  { path: "/", priority: 1 },
  { path: "/how-it-works/", priority: 0.8 },
  { path: "/services/", priority: 0.8 },
  { path: "/pricing/", priority: 0.8 },
  { path: "/faq/", priority: 0.7 },
];

/** The card image shown when a page is shared (public/og-image.png, 1200×630). */
const shareImage = { url: "/og-image.png", width: 1200, height: 630, alt: `${site.name} – Telehealth care anytime, anywhere in British Columbia` };

/**
 * Title, description, canonical link and social share card for one page.
 * `title` goes through the layout's "%s | 123 Virtual Clinic" template unless
 * `absolute` is set.
 */
export function pageMeta({ title, description, path, absolute = false }: { title: string; description: string; path: string; absolute?: boolean }): Metadata {
  const fullTitle = absolute ? title : `${title} | ${site.name}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName: site.name, locale: "en_CA", type: "website", images: [shareImage] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage.url] },
  };
}

/** Structured data for Google: the clinic itself. */
export const clinicJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  logo: `${site.url}/icon.png`,
  image: `${site.url}/og-image.png`,
  telephone: site.phone,
  email: site.email,
  description: "Virtual walk-in clinic for British Columbia: see a Canadian-licensed doctor by phone or video for prescriptions, doctor’s notes, lab and imaging requisitions.",
  medicalSpecialty: "PrimaryCare",
  isAcceptingNewPatients: true,
  areaServed: { "@type": "AdministrativeArea", name: "British Columbia, Canada" },
  address: { "@type": "PostalAddress", streetAddress: "108-2777 Gladwin Rd.", addressLocality: "Abbotsford", addressRegion: "BC", addressCountry: "CA" },
  sameAs: ["https://www.facebook.com/123Walkinclinic/", "https://www.instagram.com/123virtualclinic/"],
};

/** Structured data for Google: an FAQ page's questions and answers. */
export function faqJsonLd(items: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

/** Renders structured data. `<` is escaped so the JSON can't close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
