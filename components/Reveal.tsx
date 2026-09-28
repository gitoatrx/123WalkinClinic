"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type RevealAnim =
  | "fadeInLeft"
  | "fadeInRight"
  | "fadeInUp"
  | "fadeInDown"
  | "bounceIn"
  | "bounceInLeft"
  | "bounceInRight"
  | "bounceInDown"
  | "blurIn";

/**
 * The live site's scroll-in animation (Flatsome's data-animate). The block
 * starts hidden and offset; when it scrolls into view it eases into place.
 * The styles live in globals.css; `delay` staggers blocks in a row, as the live
 * theme does for its 2nd, 3rd and 4th columns (0.2s, 0.4s, 0.6s).
 */
export function Reveal({
  anim,
  delay = 0,
  className,
  children,
}: {
  anim: RevealAnim;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.animated = "true";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-animate={anim} className={className} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}
