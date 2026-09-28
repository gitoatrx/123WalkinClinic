/* eslint-disable @next/next/no-img-element -- static export; images are served from /public */
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Container } from "@/components/Container";
import { InnerHero } from "@/components/InnerHero";
import { Reveal } from "@/components/Reveal";
import { serviceBlocks, servicesPage as p } from "@/lib/pages";

export const metadata: Metadata = pageMeta({
  title: "Online Doctor Services in BC",
  description: "Prescriptions and refills, doctor’s notes, blood tests, imaging requisitions and medical advice from Canadian-licensed doctors, online across British Columbia.",
  path: "/services/",
});

const byId = Object.fromEntries(serviceBlocks.map((s) => [s.id, s]));

// Live panel type: 40px headings on a 1.0 line height, 20px/32px text.
const title = "text-[2rem] leading-[1.1] font-extrabold text-black sm:text-[2.5rem] sm:leading-none";
const body = "mt-5 text-[1.15rem] leading-[1.6] text-[#191919] sm:text-[1.25rem]";

/**
 * Services, laid out like the live page at desktop: each service is a 500px
 * band, 30px apart, with the photo and text boxes positioned as measured on
 * 123walkin.com. Below 850px the boxes stack.
 */
export default function ServicesPage() {
  const rx = byId["prescription-services"];
  const notes = byId["doctors-notes"];
  const blood = byId["blood-tests"];
  const imaging = byId["imaging"];
  const guidance = byId["guidance"];

  return (
    <>
      <InnerHero
        centerText
        title={p.heroTitle}
        body={p.heroBody}
        titleClass="text-[2.4rem] leading-[1.3] sm:text-[3.2rem]"
        textAnim="bounceInLeft"
        art={<img src="/images/services-hero.svg" alt="Man sitting on a bench using a laptop for an online doctor visit" width={580} height={549} className="mx-auto w-full max-w-[580px]" />}
      />

      <section className="pt-10 text-center lg:pt-[90px]">
        <Container>
          <Reveal anim="bounceIn" className="mx-auto max-w-[885px]">
            <h2 className="text-[2rem] leading-[1.3] font-extrabold text-black sm:text-[2.56rem]">{p.solutionsHeading}</h2>
            <p className="mt-5 text-[1.24rem] leading-[1.6] text-[#191919]">{p.solutionsBody}</p>
          </Reveal>
        </Container>
      </section>

      <Container className="mt-12 space-y-8 pb-16 lg:mt-[56px] lg:space-y-[30px] lg:pb-[60px]">
        {/* Prescription Services — photo on a pale 60% box, text box overlapping on the right */}
        <article className="relative lg:h-[500px]">
          <Reveal anim="bounceInLeft" className="rounded-[10px] bg-[#f1f5fd] pb-6 lg:absolute lg:top-0 lg:left-0 lg:h-[493px] lg:w-[60%] lg:pb-[50px] lg:pl-[50px]">
            <img src="/images/services-prescriptions.jpg" alt="Doctor listening closely to a patient" loading="lazy" className="aspect-[3/2] w-full object-cover lg:aspect-auto lg:h-[443px]" />
          </Reveal>
          <div className="flex flex-col justify-center bg-[#f1f5fd]/90 px-4 py-8 text-center lg:absolute lg:px-0 lg:top-[42px] lg:right-0 lg:h-[416px] lg:w-[55%]">
            <h2 className={title}>{rx.title}</h2>
            <p className={body}>{rx.body}</p>
          </div>
        </article>

        {/* Doctor's Notes Online — text left on a pale curved band, tilted photo right */}
        <article className="relative overflow-hidden bg-linear-to-r from-[#eef0fd] to-[#fbf0f3] p-8 lg:h-[500px] lg:p-0 lg:[clip-path:ellipse(95%_100%_at_50%_0%)]">
          <Reveal anim="bounceInDown" className="lg:absolute lg:top-[134px] lg:left-[60px] lg:w-[40%]">
            <h2 className={title}>{notes.title}</h2>
            <p className={body}>{notes.body}</p>
          </Reveal>
          <img
            src="/images/services-doctors-notes.jpg"
            alt="Doctor writing a note at a laptop"
            loading="lazy"
            className="mt-8 aspect-[633/483] w-full rotate-[-11deg] object-cover lg:absolute lg:top-[18px] lg:left-[44.5%] lg:mt-0 lg:w-[633px]"
          />
        </article>

        {/* Blood Test Requests — text box left, photo on a pale 61% box right */}
        <article className="relative lg:h-[501px]">
          <Reveal anim="bounceInRight" className="rounded-[10px] bg-[#f1f5fd] pb-6 lg:absolute lg:top-0 lg:right-0 lg:h-[501px] lg:w-[61%] lg:pb-[50px] lg:pl-[50px]">
            <img src="/images/services-blood-tests.jpg" alt="Elderly patient being cared for" loading="lazy" className="aspect-[3/2] w-full object-cover lg:aspect-auto lg:h-[451px]" />
          </Reveal>
          <div className="relative flex flex-col justify-center bg-[#f1f5fd]/90 px-4 py-8 lg:absolute lg:top-[42px] lg:left-0 lg:h-[416px] lg:w-[55%] lg:pr-0 lg:pl-2.5">
            <h2 className={title}>{blood.title}</h2>
            <p className={body}>{blood.body}</p>
          </div>
        </article>

        {/* Imaging Requisitions — tilted photo left, white card right, light grey band */}
        <article className="relative bg-[#f2f2f2] p-8 lg:h-[500px] lg:p-0">
          <Reveal anim="bounceInLeft" className="lg:absolute lg:top-[21px] lg:left-[-30px] lg:w-[633px]">
            <img src="/images/services-imaging.jpg" alt="Clinicians reviewing a scan" loading="lazy" className="aspect-[633/480] w-full rotate-[-11deg] object-cover" />
          </Reveal>
          <div className="mt-8 bg-white/[0.86] p-6 text-center shadow-[0_10px_20px_rgb(0_0_0/0.19)] lg:absolute lg:top-[80px] lg:right-[59px] lg:mt-0 lg:w-[40%] lg:p-[30px]">
            <h2 className={title}>{imaging.title}</h2>
            <p className={body}>{imaging.body}</p>
          </div>
        </article>

        {/* General Medical Guidance — text left on the live textured band, tilted photo right */}
        <article className="relative bg-[url(/images/services-guidance-bg.png)] bg-cover bg-center p-8 lg:h-[500px] lg:p-0">
          <div className="text-center lg:absolute lg:top-[150px] lg:left-0 lg:w-[48%]">
            <h2 className={title}>{guidance.title}</h2>
            <p className={body}>{guidance.body}</p>
          </div>
          <Reveal anim="bounceInRight" className="mt-8 lg:absolute lg:top-0 lg:left-[49%] lg:mt-0 lg:w-[642px]">
            <img
              src="/images/services-guidance.jpg"
              alt="Doctor discussing medical documents with a senior couple"
              loading="lazy"
              className="aspect-[642/500] w-full rotate-[13deg] object-cover"
            />
          </Reveal>
        </article>
      </Container>
    </>
  );
}
