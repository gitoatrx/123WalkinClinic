import type { MetadataRoute } from "next";
import { sitemapPages } from "@/lib/seo";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** /sitemap.xml — the public pages (the booking form is left out on purpose). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return sitemapPages.map((p) => ({
    url: new URL(p.path, site.url).toString(),
    lastModified,
    changeFrequency: "monthly",
    priority: p.priority,
  }));
}
