import Link from "next/link";
import { BookLink } from "./BookLink";
import type { ComponentType, SVGProps } from "react";
import { finalCta, footerLocations, nav, site } from "@/lib/site";
import { AlertIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon } from "./icons";
import { Logo } from "./Logo";
import { Lottie } from "./Lottie";

const heading = "mb-2.5 text-[20px] leading-[32px] font-extrabold text-white";

const wrap = "mx-auto w-full max-w-[1220px] px-[15px]";

const socials: { label: string; href: string; icon: ComponentType<SVGProps<SVGSVGElement>>; external?: boolean }[] = [
  { label: "Facebook", href: "https://www.facebook.com/123Walkinclinic/", icon: FacebookIcon, external: true },
  { label: "Email", href: site.emailHref, icon: MailIcon },
  { label: "Phone", href: site.phoneHref, icon: PhoneIcon },
  { label: "Instagram", href: "https://www.instagram.com/123virtualclinic/", icon: InstagramIcon, external: true },
];

/**
 * The live site's footer: the Book Now band (scooter animation over the hill
 * artwork, both served from /public) running straight into the navy ground,
 * then the logo, Learn More / Virtual Clinic / Contact details, and the
 * disclaimer and copyright.
 *
 * The emergency line is not on the live site. It is kept because a clinic
 * site dropping "call 911" is a safety regression, not a style choice.
 */
export function Footer() {
  return (
    <footer className="mt-auto overflow-x-clip bg-brand-600 text-slate-200">
      {/* Book-now band, built like the live one: a 450px row whose two columns
          start at the top — the scooter in a full-width 450px box, and the text
          column opening with a 75px gap, heading, 50px gap, button, 60px gap.
          The hill artwork sits at the bottom of the row. */}
      <div className="bg-white bg-[url(/images/footer-cta-wide.png)] bg-cover bg-[position:35%_100%] bg-no-repeat">
        <div className={`${wrap} grid items-start lg:min-h-[450px] lg:grid-cols-2`}>
          <Lottie
            src="young-couple-riding-on-electric-scooter.json"
            ratio="16 / 9"
            className="order-2 w-full lg:order-1 lg:mb-[30px] lg:h-[450px]"
          />
          <div className="order-1 pt-[75px] text-center sm:pb-[60px] lg:order-2">
            <h2 className="mx-auto max-w-[36rem] text-[1.92rem] leading-none font-extrabold text-black sm:text-[2.56rem]">
              {finalCta.heading}
            </h2>
            <BookLink className="mt-5 inline-flex min-h-[2.5em] items-center rounded-[3px] bg-gold-500 px-[1.2em] text-[1.12rem] font-bold tracking-[0.03em] text-white uppercase shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] transition-colors hover:bg-gold-600 sm:mt-[50px]"
            >
              {finalCta.button}
            </BookLink>
          </div>
        </div>
      </div>

      {/* Live footer metrics: 30px above the logo, 20px/32px headings with a 10px
          gap, 40px link rows, disclaimer 30px below the lists, a faint 1px divider,
          then the copyright. */}
      <div className={`${wrap} pt-[30px] pb-14`}>
        <Logo onDark size="lg" />

        <div className="mt-[30px] grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,13fr)_minmax(0,36fr)_minmax(0,19fr)] lg:gap-0">
          <div>
            <h2 className={heading}>Learn More</h2>
            <ul className="text-base leading-[1.6]">
              {nav.map((link) => (
                <li key={link.href} className="py-[7px]">
                  <Link href={link.href} className="text-white/85 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={heading}>Virtual Clinic</h2>
            <ul className="grid grid-flow-col grid-rows-5 gap-x-8 text-base leading-[1.6] text-[#f1f1f1]">
              {footerLocations.map((place) => (
                <li key={place} className="py-[7px]">
                  {place}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={heading}>Contact details</h2>
            <ul className="text-base leading-[1.2] text-[#f1f1f1]">
              <li>
                <a href={site.phoneHref} className="transition-colors hover:text-white">
                  {site.phone}
                </a>
              </li>
              <li>
                <a href={site.emailHref} className="break-all transition-colors hover:text-white">
                  {site.email}
                </a>
              </li>
            </ul>
            <ul className="mt-4 flex gap-1.5">
              {socials.map(({ label, href, icon: IconComponent, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="grid size-[30px] place-items-center rounded-full bg-[#f1f1f1] text-brand-600 transition-colors duration-300 hover:bg-gold-500 hover:text-white"
                  >
                    <IconComponent className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-[30px] text-[0.9rem] leading-[1.6] text-[#f1f1f1]">{site.disclaimer}</p>
        <div className="mt-4 h-px bg-white/25" aria-hidden="true" />
        <p className="mt-4 text-base leading-[1.2] text-[#f1f1f1]">{site.copyright}.</p>

        <p className="mt-6 flex items-start gap-2 text-sm text-white/90">
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-red-400" />
          <span>
            <strong>Medical emergency?</strong> Call{" "}
            <a href="tel:911" className="font-semibold underline">
              911
            </a>{" "}
            or go to the nearest emergency department.
          </span>
        </p>
      </div>
    </footer>
  );
}
