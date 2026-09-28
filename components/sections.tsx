import Link from "next/link";
import { conditions, doctorsCanDo, howItWorks, pricing } from "@/lib/site";
import { AnimatedSpot } from "./Lottie";
import { Reveal } from "./Reveal";

/** Gold uppercase button, as used for Book Now across the live site. */
export const btnGold =
  "btn-fs inline-flex min-h-[2.5em] items-center justify-center gap-2 rounded-[5px] bg-gold-500 px-[1.2em] text-[0.97rem] font-extrabold tracking-[0.03em] text-white uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

/** Navy square-cornered button, the live hero's primary action. */
export const btnNavy =
  "btn-fs inline-flex min-h-[2.5em] items-center justify-center gap-2 bg-brand-600 px-[1.2em] text-base sm:min-h-[2.4em] sm:text-[1.15rem] font-extrabold tracking-[0.03em] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

/** The three steps. How It Works words step 1 slightly differently, so it can override that text. */
export function Steps({ firstBody }: { firstBody?: string } = {}) {
  return (
    <ol className="grid gap-[56px] md:grid-cols-3 md:gap-8">
      {howItWorks.steps.map((step, i) => (
        <li key={step.title}>
          <Reveal anim="fadeInLeft" delay={i * 0.2}>
            <AnimatedSpot name={step.spot} className="size-[113px]" />
            <h3 className="text-[1.24rem] leading-[1.6] font-extrabold text-brand-600 sm:text-[1.55rem]">{step.title}</h3>
            <p className="text-[1.24rem] leading-[1.6] text-brand-600">{i === 0 && firstBody ? firstBody : step.body}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

export function ServiceCards() {
  return (
    <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      {doctorsCanDo.cards.map((card, i) => (
        <li key={card.id} className="flex flex-col">
          <Reveal anim="fadeInUp" delay={i * 0.2} className="flex h-full flex-col">
          <AnimatedSpot name={card.spot} className="h-[49px] w-[69px] lg:h-[43px] lg:w-[55px]" />
          <h3 className="mt-3 text-[1.24rem] leading-[1.6] font-extrabold text-black sm:text-[1.55rem]">{card.title}</h3>
          <p className="mt-2 flex-1 text-[1.24rem] leading-[1.6] text-[#191919]">{card.body}</p>
          <Link
            href={`/services/#${card.id}`}
            className="mt-3 self-start text-[0.97rem] font-extrabold tracking-[0.03em] text-gold-500 uppercase transition-colors duration-300 hover:text-[#333]"
          >
            Learn more
          </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** Icon file for a condition: "Skin Infection" -> /icons/conditions/skin-infection.svg */
const conditionIcon = (label: string) =>
  `/icons/conditions/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.svg`;

/**
 * "Navigating Your Health Concerns": heading on the left, a 4×4 grid of white
 * icon cards on the right — the live site's layout, with its line icons
 * served from /public/icons/conditions.
 */
export function Conditions() {
  return (
    <section className="bg-[var(--color-wash-conditions)] py-16 sm:pt-20 lg:pb-[100px]">
      <div className="mx-auto grid w-full max-w-[1220px] px-[15px] gap-10 lg:grid-cols-[1fr_2fr] lg:gap-[30px]">
        <div>
          <p className="text-[1.55rem] leading-[1.2] font-normal whitespace-pre-line text-gold-500">
            {conditions.eyebrow.replace("Your ", "Your\n")}
          </p>
          <h2 className="text-[2.1rem] leading-[1.2] font-extrabold text-black sm:text-[2.8rem]">
            {conditions.heading}
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-[30px]">
          {conditions.items.map((item) => (
            <li
              key={item}
              className="flex flex-col items-center rounded-[5px] bg-white px-2 py-5 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, plain SVG */}
              <span className="mb-[18px] block h-[72px] pt-[0.2em]">
                <img src={conditionIcon(item)} alt="" width={60} height={60} loading="lazy" className="size-[60px]" />
              </span>
              <span className="text-base leading-[1.6] text-[#191919] sm:text-[1.15rem]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The live site's pricing: three plain columns, each a gold "Plan – $price" heading over its description. */
export function PricingCards() {
  return (
    <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
      {pricing.plans.map((plan) => (
        <li key={plan.title}>
          <h3 className="text-[1.24rem] leading-[1.6] font-extrabold text-gold-500 sm:text-[1.55rem]">
            {plan.title} – {plan.price}
          </h3>
          <p className="mt-3 text-[1.24rem] leading-[1.6] text-[#191919]">{plan.body}</p>
        </li>
      ))}
    </ul>
  );
}
