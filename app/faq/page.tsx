/* eslint-disable @next/next/no-img-element -- static export; images are served from /public */
import type { Metadata } from "next";
import { faqJsonLd, JsonLd, pageMeta } from "@/lib/seo";
import { Accordion } from "@/components/Accordion";
import { Container } from "@/components/Container";
import { InnerHero } from "@/components/InnerHero";
import { faqPage as p } from "@/lib/pages";

export const metadata: Metadata = pageMeta({
  title: "FAQ – Prescriptions, Notes & Imaging",
  description: "Answers about virtual care in BC: how online doctor visits work, prescriptions, imaging requisitions, doctor’s notes, costs with MSP and when to go in person.",
  path: "/faq/",
});

// Live type scale for this page (it has no scroll animations on the live site).
const h2 = "text-[1.7rem] leading-[1.3] font-extrabold text-black sm:text-[1.98rem]";
const body = "text-[1.24rem] leading-[1.6] text-[#191919]";

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd([...p.general, ...p.rx, ...p.imaging, ...p.notes])} />
      <InnerHero
        title={p.heroTitle}
        body={p.heroBody}
        titleClass="text-[1.9rem] leading-[1.6] sm:text-[2.25rem]"
        bodyClass="text-[1.15rem] leading-[1.6] sm:text-[1.25rem]"
        art={<img src="/images/faq-doctor-patient.svg" alt="Patient on a video call with a doctor from home" width={464} height={437} className="w-full max-w-[464px]" />}
      />

      {/* General questions — the first opens by default, as on the live page */}
      <section className="pt-10 lg:pt-[61px] lg:pb-[71px]">
        <Container>
          <h2 className="sr-only">General questions</h2>
          <Accordion items={p.general} openFirst />
        </Container>
      </section>

      {/* Prescriptions — 580px illustration left, questions right */}
      <section className="py-10 lg:pt-[30px] lg:pb-[60px]">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-[30px]">
          <img src="/images/faq-prescriptions.jpg" alt="People with questions gathered around a large question mark" width={580} height={580} loading="lazy" className="mx-auto w-full max-w-[580px]" />
          <div>
            <h2 className={h2}>{p.rxHeading}</h2>
            <p className={`${body} mt-4`}>{p.rxBody}</p>
            <div className="mt-[26px]">
              <Accordion items={p.rx} />
            </div>
          </div>
        </Container>
      </section>

      {/* Imaging Requisitions — grey box, 40px padding */}
      <section className="py-10 lg:py-[30px]">
        <Container>
          <div className="grid items-center gap-8 bg-[#f1f1f1] p-6 sm:p-10 lg:min-h-[337px] lg:grid-cols-2 lg:gap-[30px]">
            <div className="text-center">
              <h2 className={h2}>{p.imagingHeading}</h2>
              <p className={`${body} mt-4`}>{p.imagingBody}</p>
            </div>
            <Accordion items={p.imaging} variant="plain" />
          </div>
        </Container>
      </section>

      {/* Doctor's Notes */}
      <section className="py-10 lg:py-[30px] lg:pb-[60px]">
        <Container>
          <div className="mx-auto max-w-[783px] text-center">
            <h2 className={h2}>{p.notesHeading}</h2>
            <p className={`${body} mt-4`}>{p.notesBody}</p>
          </div>
          <ul className="mt-10 grid gap-x-[30px] gap-y-10 md:grid-cols-2 lg:mt-[55px] lg:gap-y-[54px]">
            {p.notes.map((n) => (
              <li key={n.q} className="flex gap-4">
                <img src="/icons/question-bubble.svg" alt="" width={45} height={45} className="mt-1 size-[45px] shrink-0" />
                <div>
                  <h3 className="text-[1.3rem] leading-[1.6] font-extrabold text-black sm:text-[1.44rem]">{n.q}</h3>
                  <p className="mt-3 text-[1.1rem] leading-[1.6] text-[#191919] sm:text-[1.15rem]">{n.a}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
