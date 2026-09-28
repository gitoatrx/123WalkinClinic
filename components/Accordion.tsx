import type { QA } from "@/lib/pages";
import { cn } from "@/lib/ui";

/**
 * The live site's FAQ accordions, in its three looks:
 *  - "line":  white rows with thin dividers; an open item gets a navy rule, a
 *             light grey question bar and an indented answer (How It Works)
 *  - "gray":  grey question bars 11px apart with a thin top rule; an open item's
 *             rule turns navy and its answer sits in a white bordered box (Pricing, FAQ)
 *  - "plain": no background until opened, then a grey question bar over an
 *             indented answer — used inside a grey panel (FAQ › Imaging)
 * Live metrics: questions 17.6px on a 1.6 line height in 50px rows, answers 16px.
 * Native <details>, so it works without JavaScript and with the keyboard. Items in
 * one accordion share a `name`, so opening a question closes the others, as on
 * the live site.
 */
export function Accordion({
  items,
  variant = "gray",
  openFirst = false,
  accent = false,
}: {
  items: QA[];
  variant?: "line" | "gray" | "plain";
  openFirst?: boolean;
  /** Navy question text, as on the FAQ page. */
  accent?: boolean;
}) {
  // Stable per-accordion group name, derived from its first question.
  const group = "faq-" + items[0]?.q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return (
    <div className={cn(variant === "line" && "border-t border-[#ddd]", variant === "gray" && "space-y-[11px]", variant === "plain" && "space-y-0")}>
      {items.map((item, i) => (
        <details
          key={item.q}
          name={group}
          open={openFirst && i === 0}
          className={cn(
            "group",
            variant === "line" && "border-b border-[#ddd] open:border-t open:border-t-brand-600",
            variant === "gray" && "border-t border-[#ddd] open:border-brand-600",
          )}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-start gap-3 px-3 py-[11px] text-[1.1rem] leading-[1.6] transition-colors",
              variant === "gray" && "bg-[#f1f1f1]",
              variant === "plain" && "group-open:bg-[#e8e8e8]",
              variant === "line" && "group-open:bg-[#f6f6f6]",
              accent ? "text-brand-600" : "text-[#191919] group-open:text-brand-600",
            )}
          >
            <span aria-hidden="true" className="relative mt-[0.5em] size-3.5 shrink-0 text-current opacity-70">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform group-open:scale-y-0" />
            </span>
            <h3>{item.q}</h3>
          </summary>
          <p
            className={cn(
              "text-base leading-[1.6] whitespace-pre-line text-[#191919]",
              variant === "gray" && "border border-t-0 border-[#ddd] bg-white p-2.5 pb-6",
              variant === "line" && "pt-4 pr-6 pb-7 pl-12",
              variant === "plain" && "py-4 pr-4 pl-9",
            )}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
