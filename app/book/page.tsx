import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Book a Walk-In Appointment",
    description: "Book a phone, video or in-clinic walk-in appointment with 123 Virtual Clinic in British Columbia.",
    path: "/book/",
  }),
  // A form, not content: keep it out of search results.
  robots: { index: false, follow: true },
};

export default function BookPage() {
  return <BookingFlow />;
}
