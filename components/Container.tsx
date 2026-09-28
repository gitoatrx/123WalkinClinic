import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1220px] px-[15px]", className)}>{children}</div>;
}

/** Banner at the top of inner pages, in the live site's pale teal wash. */
export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: ReactNode }) {
  return (
    <section className="bg-linear-to-b from-[var(--color-wash-hero-from)] via-[var(--color-wash-hero-via)] to-white">
      <Container className="pt-32 pb-14 text-center sm:pt-36 sm:pb-20 lg:pt-40">
        {eyebrow && <p className="text-sm font-bold tracking-wide text-gold-500 uppercase">{eyebrow}</p>}
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl leading-tight font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl">
          {title}
        </h1>
        {intro && <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-slate-700">{intro}</p>}
      </Container>
    </section>
  );
}
