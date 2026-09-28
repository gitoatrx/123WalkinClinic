// Booking flow modelled on the clinic's Cortico page (123walkin.cortico.ca).
// With Bimble connected (lib/bimble.ts) doctors, dates and times come from the
// clinic's Bimble schedule and the booking is made in Bimble. Without it this is
// a demo: open times are simulated and nothing is sent anywhere. The site itself
// never stores health card numbers; they are only passed to Bimble.

export const clinicLocation = {
  name: "Abbotsford",
  clinic: "123 Walk-In Clinic",
  address: "108-2777 Gladwin Rd., BC",
  timeZone: "America/Vancouver",
  /** Cortico shows "Available in 3 days" for this clinic; the demo mirrors it. */
  daysUntilAvailable: 3,
};

export const serviceOptions = [{ id: "walk-in", label: "Walk-In appointment", description: "See the first available doctor by phone, video or in clinic." }];

export const methods = [
  { id: "in-clinic", label: "In-Clinic" },
  { id: "video", label: "Video Call" },
  { id: "phone", label: "Phone Call" },
] as const;
export type MethodId = (typeof methods)[number]["id"];

export const providers = ["First available provider"];

export const sexOptions = [
  { id: "F", label: "Female" },
  { id: "M", label: "Male" },
  { id: "O", label: "Other" },
  { id: "U", label: "Prefer not to say" },
];

export const formNoteOptions = ["No", "Yes – doctor’s note (fee may apply)", "Yes – form (fee may apply)"];

export const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type BookingData = {
  serviceId: string;
  hasCard: boolean;
  cardNumber: string;
  dobYear: string;
  dobMonth: number;
  dobDay: string;
  staySignedIn: boolean;
  consent: boolean;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  homePhone: string;
  reason: string;
  /** Optional; sent to Bimble so the doctor sees it. */
  allergies: string;
  formNote: string;
  /** Bimble doctor id, or "any" for the first available doctor (live mode). */
  providerId: string;
  provider: string;
  sex: string;
  method: MethodId | "";
  date: string;
  time: number | null;
  /** Live mode: Bimble's slot label ("9:15 AM") and the doctor who has that time. */
  slotTime: string;
  slotDoctorId: number | null;
  delivery: "delivery" | "pickup";
  pharmacy: string;
  pharmacyConsent: boolean;
  notes: string;
};

export const emptyBooking: BookingData = {
  serviceId: "walk-in",
  hasCard: true,
  cardNumber: "",
  dobYear: "",
  dobMonth: 0,
  dobDay: "",
  staySignedIn: false,
  consent: false,
  firstName: "",
  lastName: "",
  email: "",
  cellPhone: "",
  homePhone: "",
  reason: "",
  allergies: "",
  formNote: formNoteOptions[0],
  providerId: "any",
  provider: providers[0],
  sex: "",
  method: "",
  date: "",
  time: null,
  slotTime: "",
  slotDoctorId: null,
  delivery: "pickup",
  pharmacy: "",
  pharmacyConsent: false,
  notes: "",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date at the clinic as YYYY-MM-DD. */
function clinicToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts; // en-CA formats as YYYY-MM-DD
}

/** The next 14 bookable days, starting when the clinic's earliest availability opens. */
export function availableDates(): string[] {
  const [y, m, d] = clinicToday().split("-").map(Number);
  return Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + clinicLocation.daysUntilAvailable + i));
    return dt.toISOString().slice(0, 10);
  });
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Simulated open times (15-minute steps, 9:00 AM–5:00 PM), stable per date. */
export function availableTimes(date: string, method: string): number[] {
  const times: number[] = [];
  for (let t = 9 * 60; t < 17 * 60; t += 15) if (hash(`${date}-${method}-${t}`) % 10 >= 4) times.push(t);
  return times;
}

export function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(minutes % 60)} ${h >= 12 ? "PM" : "AM"} (PT)`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "Monday, September 28th, 2026" — Cortico's date wording. */
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = dt.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
  return `${weekday}, ${months[m - 1]} ${ordinal(d)}, ${y}`;
}

export function methodLabel(id: string) {
  return methods.find((m) => m.id === id)?.label ?? "";
}

export function locationLine(b: BookingData) {
  if (b.method === "video") return "Video appointment – a link will be emailed";
  if (b.method === "phone") return `Phone appointment – the doctor will call ${b.cellPhone || b.homePhone}`;
  return `${clinicLocation.clinic}, ${clinicLocation.address}`;
}

function stamp(date: string, minutes: number) {
  return `${date.replaceAll("-", "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

/** An .ics calendar file for the booked appointment (Add to Calendar). */
export function calendarFile(b: BookingData) {
  if (b.time === null) return "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//123 Walk-In Clinic//Booking demo//EN",
    "BEGIN:VEVENT",
    `UID:${b.date}-${b.time}@123walkin-demo`,
    `DTSTART;TZID=${clinicLocation.timeZone}:${stamp(b.date, b.time)}`,
    `DTEND;TZID=${clinicLocation.timeZone}:${stamp(b.date, b.time + 15)}`,
    `SUMMARY:${clinicLocation.clinic} – ${methodLabel(b.method)}`,
    `LOCATION:${locationLine(b).replaceAll(",", "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
