/* eslint-disable @next/next/no-img-element -- static export; images are served from /public */
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Accordion } from "@/components/Accordion";
import { Container } from "@/components/Container";
import { InnerHero } from "@/components/InnerHero";
import { Reveal } from "@/components/Reveal";
import { pricingPage as p } from "@/lib/pages";

export const metadata: Metadata = pageMeta({
  title: "Pricing – $0 with MSP",
  description: "Virtual doctor visits are $0 with BC MSP. Without MSP, a private visit is $100. Doctor’s notes are $50 and forms $75 per page. See what’s covered.",
  path: "/pricing/",
});

/** The live site's gold line icons, one per plan, in the order of pricingPage.plans. */
const planIcons = ["virtual-care", "private-visit", "doctors-notes", "page-forms"];

// Live type scale for this page.
const h2 = "text-[1.7rem] leading-[1.3] font-extrabold text-black sm:text-[1.98rem]";
const body = "text-[1.24rem] leading-[1.6] text-[#191919]";

export default function PricingPage() {
  return (
    <>
      <InnerHero
        title={p.heroTitle}
        body={p.heroBody}
        titleClass="text-[2.3rem] leading-[1.3] sm:text-[2.88rem]"
        textAnim="bounceInLeft"
        artAnim="bounceInRight"
        art={<img src="/images/pricing-hero.svg" alt="Stethoscope, medical checklist and syringe" width={220} height={220} className="ml-auto w-[220px] max-w-full" />}
      />

      {/* Streamlined Healthcare Solutions + the four plan cards */}
      <section className="pt-10 text-center lg:pt-[60px]">
        <Container>
          <Reveal anim="bounceInDown">
            <h2 className={h2}>{p.plansHeading}</h2>
            <p className={`${body} mt-4`}>{p.plansBody}</p>
          </Reveal>

          <ul className="mt-10 grid gap-[30px] md:grid-cols-2 lg:mt-[55px]">
            {p.plans.map((plan, i) => (
              <li
                key={plan.title}
                className="rounded-[10px] border border-gold-500/60 bg-white px-5 pt-[60px] pb-5 shadow-[0_3px_6px_-4px_rgb(0_0_0/0.16),0_3px_6px_rgb(0_0_0/0.23)] lg:min-h-[331px]"
              >
                <span className="mx-auto grid size-20 place-items-center rounded-full border border-[#bf882c]/70">
                  <img src={`/icons/pricing/${planIcons[i]}.svg`} alt="" width={44} height={44} className="size-11" />
                </span>
                <h3 className="mt-9 text-[1.45rem] leading-[1.3] font-extrabold text-black sm:text-[1.6rem]">{plan.title}</h3>
                <p className={`${body} mx-auto mt-3 max-w-[540px]`}>{plan.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Appointment Cancellation Guidelines */}
      <section className="pt-14 text-center lg:pt-[91px]">
        <Container>
          <Reveal anim="bounceIn" className="mx-auto max-w-[783px]">
            <h2 className={h2}>{p.cancelHeading}</h2>
            <p className={`${body} mt-4`}>{p.cancelBody}</p>
          </Reveal>
        </Container>
      </section>

      {/* Understanding the Medical Services Plan — faint navy tint */}
      <section className="mt-14 bg-[rgb(20_33_74/0.027)] py-10 lg:mt-[86px] lg:pt-[30px] lg:pb-[60px]">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-[30px]">
          <Reveal anim="bounceInLeft">
            <img src="/images/pricing-msp.svg" alt="Doctor reviewing heart and stomach health results" loading="lazy" width={580} height={580} className="mx-auto w-full max-w-[580px]" />
          </Reveal>
          <Reveal anim="bounceInRight">
            <h2 className={h2}>{p.mspHeading}</h2>
            {p.mspBody.map((para, i) => (
              <p key={para} className={`${body} ${i === 0 ? "mt-4" : "mt-[26px]"}`}>
                {para}
              </p>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* FAQ — all questions start closed, as on the live page */}
      <section className="pt-14 pb-16 lg:pt-[60px] lg:pb-[60px]">
        <Container>
          <h2 className="text-center text-[1.9rem] leading-[1.3] font-extrabold text-black sm:text-[2.24rem]">{p.faqHeading}</h2>
          <div className="mt-[18px]">
            <Accordion items={p.faqs} />
          </div>
        </Container>
      </section>
    </>
  );
}
