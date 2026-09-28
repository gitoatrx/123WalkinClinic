import type { ReactNode } from "react";
import { cn } from "@/lib/ui";
import { Container } from "./Container";
import { Reveal, type RevealAnim } from "./Reveal";

/**
 * Top banner of the inner pages: text left, illustration right, over the live
 * site's pale cyan wash (the transparent header sits on top of it). Column split,
 * sizes and spacing are passed per page, matching the live measurements — the
 * artwork row starts 130px down (100px header + 30px section padding).
 */
export function InnerHero({
  title,
  body,
  art,
  split = "half",
  centerText = false,
  titleClass,
  bodyClass = "text-[1.24rem] leading-[1.6]",
  className,
  textAnim,
  artAnim,
  topClass = "lg:pt-[130px]",
}: {
  title: string;
  body: string;
  art: ReactNode;
  /** "half" = 50/50 (Services, Pricing, FAQ); "twoThirds" = 8/12 + 4/12 (How It Works). */
  split?: "half" | "twoThirds";
  centerText?: boolean;
  titleClass: string;
  bodyClass?: string;
  className?: string;
  textAnim?: RevealAnim;
  artAnim?: RevealAnim;
  /** Desktop top offset of the row; live is 130px, How It Works 180px. */
  topClass?: string;
}) {
  const text = (
    <div className={cn(centerText && "text-center")}>
      <h1 className={cn("font-extrabold text-black", titleClass)}>{title}</h1>
      <p className={cn("mt-4 text-pretty text-[#191919]", bodyClass)}>{body}</p>
    </div>
  );
  return (
    <section className="bg-linear-to-b from-[#dff4fa] to-white">
      <Container
        className={cn(
          "grid items-center gap-8 pt-[130px] pb-10 lg:gap-[30px] lg:pb-[30px]",
          topClass,
          split === "half" ? "lg:grid-cols-2" : "lg:grid-cols-[minmax(0,783fr)_minmax(0,377fr)]",
          className,
        )}
      >
        {textAnim ? <Reveal anim={textAnim}>{text}</Reveal> : text}
        {artAnim ? <Reveal anim={artAnim}>{art}</Reveal> : art}
      </Container>
    </section>
  );
}
