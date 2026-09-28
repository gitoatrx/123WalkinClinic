import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Accordion } from "@/components/Accordion";
import { Container } from "@/components/Container";
import { Icon } from "@/components/icons";
import { InnerHero } from "@/components/InnerHero";
import { Lottie } from "@/components/Lottie";
import { Reveal, type RevealAnim } from "@/components/Reveal";
import { Steps } from "@/components/sections";
import { howItWorksFaqs, howItWorksPage as p, limits, serviceBlocks } from "@/lib/pages";
import { cn } from "@/lib/ui";

export const metadata: Metadata = pageMeta({
  title: "How Virtual Doctor Visits Work in BC",
  description: "Book online, pick a time, and talk to a Canadian-licensed doctor by phone or video. See how a virtual visit with 123 Virtual Clinic works, step by step.",
  path: "/how-it-works/",
});

// Live type scale for this page (Flatsome h2 1.6em / h3 1.25em of a 1.24rem text block).
const h2 = "text-[1.7rem] leading-[1.3] font-extrabold text-black sm:text-[1.98rem]";
const h3 = "text-[1.3rem] leading-[1.6] font-extrabold text-black sm:text-[1.55rem]";
const body = "text-[1.24rem] leading-[1.6] text-[#191919]";

/** Entrance of each service card on the live page, top to bottom. */
const cardAnims: RevealAnim[] = ["fadeInDown", "fadeInRight", "fadeInLeft", "fadeInRight", "fadeInLeft", "fadeInUp"];

export default function HowItWorksPage() {
  return (
    <>
      <InnerHero
        split="twoThirds"
        topClass="lg:pt-[180px]"
        title={p.heroTitle}
        body={p.heroBody}
        titleClass="text-[2.2rem] leading-[1.3] tracking-[-0.02em] sm:text-[2.64rem]"
        art={
          // eslint-disable-next-line @next/next/no-img-element -- static export, plain SVG
          <img src="/images/how-it-works-hero.svg" alt="Woman relaxing in an armchair while using her phone" width={377} height={444} className="mx-auto w-full max-w-[377px]" />
        }
      />

      {/* Your Easy Access to Telehealth — 111px from heading to step icons */}
      <section className="pb-16 lg:pb-[146px]">
        <Container>
          <h2 className="text-[2.2rem] leading-[1.3] font-extrabold text-black sm:text-[2.64rem]">{p.stepsHeading}</h2>
          <div className="mt-12 lg:mt-[111px]">
            <Steps firstBody={p.firstStepBody} />
          </div>
        </Container>
      </section>

      {/* Our Virtual Doctors Can Help — services: 5/12 text + 7/12 cards */}
      <section className="pb-16 lg:pb-[106px]">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,489fr)_minmax(0,701fr)] lg:gap-0">
          <Reveal anim="fadeInLeft" className="lg:pr-[11px]">
            <h2 className={h2}>{p.helpHeading}</h2>
            <p className={cn(body, "mt-4")}>{p.helpBody}</p>
            <Lottie src="online-medical-consultation.json" ratio="383 / 431" className="mt-[26px] w-full max-w-[383px]" />
          </Reveal>
          <ul className="space-y-[35px]">
            {serviceBlocks.map((s, i) => (
              <li key={s.id}>
                <Reveal anim={cardAnims[i]} className={cn("flex gap-4 rounded-[10px] bg-linear-to-r px-5 pt-5 pb-2.5", s.gradient)}>
                  <span className="grid h-[63px] w-[60px] shrink-0 place-items-start text-brand-600">
                    <Icon name={s.icon} className="size-[52px]" strokeWidth={1.3} />
                  </span>
                  <div>
                    <h3 className={h3}>{s.title}</h3>
                    <p className={cn(body, "mt-3")}>{s.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Our Virtual Doctors Can Help — limits */}
      <section className="pb-16 lg:pb-[116px]">
        <Container>
          <Reveal anim="bounceIn">
            <h2 className={h2}>{p.limitsHeading}</h2>
            <p className={cn(body, "mt-4")}>{p.limitsBody}</p>
          </Reveal>
          <ul className="mt-10 grid gap-x-[30px] gap-y-8 md:grid-cols-2 lg:mt-[55px] lg:gap-y-[56px]">
            {limits.map((l) => (
              <li key={l.title} className="rounded-[10px] border border-[#e5e5e5] px-5 pt-5 pb-2.5">
                <h3 className={h3}>{l.title}</h3>
                <p className={cn(body, "mt-3")}>{l.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FAQ — all questions start closed, as on the live page */}
      <section className="pb-16 lg:pb-[60px]">
        <Container>
          <h2 className={h2}>{p.faqHeading}</h2>
          <div className="mt-4">
            <Accordion items={howItWorksFaqs} variant="line" />
          </div>
        </Container>
      </section>
    </>
  );
}
