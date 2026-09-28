import Link from "next/link";
import { site } from "@/lib/site";

/** The clinic's "123VC" logo, served from /public/images (black on light, white on dark). */
export function Logo({ onDark = false, size = "md" }: { onDark?: boolean; size?: "md" | "lg" }) {
  return (
    <Link
      href="/"
      title={site.name}
      className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export, plain SVG */}
      <img
        src={onDark ? "/images/logo-white.svg" : "/images/logo-black.svg"}
        alt={site.name}
        width={120}
        height={37}
        className={size === "lg" ? "h-12 w-auto sm:h-[63px]" : "h-[47px] w-auto"}
      />
    </Link>
  );
}
