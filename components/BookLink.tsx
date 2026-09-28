import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

/**
 * Every "Book" button. Points at site.bookingUrl: the in-site Cortico-style flow
 * (/book/), or — if that setting is switched to the real Cortico page — Cortico
 * in a new tab, as on the live site.
 */
export function BookLink({ className, children }: { className?: string; children: ReactNode }) {
  if (site.bookingUrl.startsWith("/")) {
    return (
      <Link href={site.bookingUrl} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens the booking page in a new tab)</span>
    </a>
  );
}
