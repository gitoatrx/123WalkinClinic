import type { Metadata } from "next";
import Link from "next/link";
import { BookLink } from "@/components/BookLink";
import { Container } from "@/components/Container";
import { Lottie } from "@/components/Lottie";
import { Reveal } from "@/components/Reveal";
import { Conditions, PricingCards, ServiceCards, Steps, btnGold, btnNavy } from "@/components/sections";
import { pageMeta } from "@/lib/seo";
import { doctorsCanDo, hero, howItWorks, pricing, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: `Virtual Walk-In Clinic in BC | ${site.name}`,
  description: "See a BC doctor online by phone or video, anytime. Prescriptions, doctor’s notes, lab and imaging requisitions from 123 Virtual Clinic — $0 with MSP.",
  path: "/",
  absolute: true,
});

/**
 * The homepage, matching 123walkin.com section for section: hero, How it
 * works, What our virtual doctors can do, conditions, pricing. The Book Now
 * band and footer come from the shared Footer. Animations and images are
 * served from /public; nothing is loaded from the live site. Scroll-in effects
 * are the live ones: hero fadeInLeft, How it works bounceIn, steps fadeInLeft,
 * doctors blurIn, cards fadeInUp.
 */
export default function HomePage() {
  return (
    <>
      {/* ---- Hero + How it works ------------------------------------
          One continuous wash, as on the live site: teal behind the (transparent)
          header and hero, fading to pale cyan through How it works. */}
      <div className="bg-linear-to-b from-[var(--color-wash-hero-from)] via-[var(--color-wash-steps-from)] via-45% to-white">
        <section>
          <Container className="grid gap-8 pt-[130px] pb-[90px] lg:grid-cols-[minmax(0,1.685fr)_minmax(0,1fr)] lg:items-center lg:gap-[30px] lg:pt-[185px] lg:pb-[145px]">
            <Reveal anim="fadeInLeft" className="lg:-ml-10">
              <h1 className="mb-2.5 text-[2.8rem] leading-none font-extrabold text-black sm:text-[4.25rem]">
                {hero.heading}
              </h1>
              <p className="mt-5 text-[1.25rem] leading-[1.6] text-pretty text-[#191919] sm:text-[1.4rem]">{hero.body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <BookLink className={btnNavy}>
                  {hero.primary}
                </BookLink>
                <Link href="/how-it-works/" className="text-[0.97rem] font-extrabold tracking-[0.03em] text-gold-500 uppercase transition-colors duration-300 hover:text-[#333]">
                  {hero.secondary}
                </Link>
              </div>
            </Reveal>
            <Lottie src="hero-park-bench.json" ratio="auto" className="mx-auto h-[550px] w-full lg:-ml-[39px] lg:w-[calc(100%+80px)] lg:max-w-[512px]" />
          </Container>
        </section>

        <section className="pb-16 lg:pb-[86px]">
          <Container>
            <Reveal anim="bounceIn" className="mx-auto max-w-[48rem] text-center">
              <h2 className="text-[1.49rem] leading-[1.3] font-extrabold text-brand-600 sm:text-[1.98rem]">{howItWorks.heading}</h2>
              <p className="mt-4 text-[1.24rem] leading-[1.6] text-pretty text-brand-600">{howItWorks.intro}</p>
            </Reveal>
            <div className="mt-14">
              <Steps />
            </div>
          </Container>
        </section>
      </div>

      {/* ---- What our virtual doctors can do -------------------------- */}
      <section className="pt-[52px] pb-16 lg:pt-[58px] lg:pb-24">
        <Container>
          <div className="grid items-center gap-[30px] lg:grid-cols-[7fr_5fr]">
            <Reveal anim="blurIn">
              <h2 className="text-[2.58rem] leading-[1.3] font-extrabold text-black sm:text-[3.44rem]">
                {doctorsCanDo.headingLead}
                <br />
                <span className="underline decoration-4 underline-offset-8">{doctorsCanDo.headingMark}</span>
                <br />
                {doctorsCanDo.headingTail}
              </h2>
              <p className="mt-6 text-[1.24rem] leading-[1.6] text-pretty text-[#191919]">{doctorsCanDo.intro}</p>
              <BookLink className={`${btnGold} mt-8`}>
                Book now
              </BookLink>
            </Reveal>
            <Lottie src="online-medical-consultation.json" ratio="478 / 500" className="order-first mx-auto w-full max-w-md lg:order-none lg:max-w-[478px]" />
          </div>
          <div className="mt-16">
            <ServiceCards />
          </div>
        </Container>
      </section>

      {/* ---- Conditions ----------------------------------------------- */}
      <Conditions />

      {/* ---- Pricing --------------------------------------------------- */}
      <section className="pt-16 pb-12 sm:pt-20 lg:pb-[82px]">
        <div className="mx-auto w-full max-w-[1220px] px-[15px]">
          <h2 className="text-[1.49rem] leading-[1.3] font-extrabold text-black sm:text-[1.98rem]">{pricing.heading}</h2>
          <p className="mt-4 text-[1.24rem] leading-[1.6] text-pretty text-[#191919]">{pricing.intro}</p>
          <div className="mt-14">
            <PricingCards />
          </div>
        </div>
      </section>
    </>
  );
}
