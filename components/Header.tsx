"use client";

import Link from "next/link";
import { BookLink } from "./BookLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import { cn } from "@/lib/ui";
import { Container } from "./Container";
import { MenuIcon, XIcon } from "./icons";
import { Logo } from "./Logo";

const normalize = (path: string) => (path.endsWith("/") ? path : `${path}/`);

/**
 * The live site's header: logo left, menu and a small gold Book Now right.
 * Like the live one it does not stick — it sits transparent over the top of the
 * page (100px tall at every size) and scrolls away with it. The booking pages
 * have no wash behind them, so there it is a plain white bar.
 */
export function Header() {
  const pathname = normalize(usePathname() ?? "/");
  const [open, setOpen] = useState(false);
  const overlay = !pathname.startsWith("/book");

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className={cn("z-50", overlay ? "absolute inset-x-0 top-0" : "relative bg-white shadow-[0_1px_0_rgb(15_23_42/0.06)]")}>
      <Container className="flex h-[100px] items-center justify-between gap-6">
        <Logo />

        <div className="flex items-center gap-4">
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-[1.3em] text-[1.1rem]">
              {nav.map((link) => (
                <li key={link.href}>
                  {/* Live: 17.6px links, 72px line box, and a 3px navy bar along the
                      bottom that fades in on hover and on the current page. */}
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "relative block leading-[72px] font-semibold text-[rgb(18_18_18/0.85)] transition-colors duration-200",
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-brand-600 after:transition-opacity after:duration-300",
                      isActive(link.href) ? "after:opacity-100" : "after:opacity-0 hover:after:opacity-100",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <BookLink className="btn-fs hidden h-[33px] items-center rounded-[5px] bg-gold-500 px-[1.2em] text-[13.2px] font-extrabold tracking-[0.03em] text-white uppercase sm:inline-flex"
          >
            Book now
          </BookLink>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid size-11 place-items-center rounded-lg text-slate-800 hover:bg-black/5 lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <XIcon className="size-7" /> : <MenuIcon className="size-7" />}
          </button>
        </div>
      </Container>

      {open && (
        <div id="mobile-menu" className="border-t border-slate-100 bg-white shadow-lg lg:hidden">
          <Container className="py-3">
            <nav aria-label="Mobile">
              <ul className="divide-y divide-slate-100">
                {nav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between py-3.5 text-lg",
                        isActive(link.href) ? "font-bold text-slate-900" : "font-medium text-slate-700",
                      )}
                    >
                      {link.label}
                      {isActive(link.href) && <span className="size-2 rounded-full bg-brand-600" aria-hidden="true" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <BookLink className="btn-fs mt-3 mb-2 flex items-center justify-center rounded-[5px] bg-gold-500 py-3.5 font-extrabold tracking-[0.03em] text-white uppercase"
            >
              Book now
            </BookLink>
          </Container>
        </div>
      )}
    </header>
  );
}
