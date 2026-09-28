// Booking flow data and helpers ("Short & Friendly": five short steps).
// With Bimble connected (lib/bimble.ts) reasons, doctors, dates and times come
// from the clinic's Bimble schedule and the booking is made in Bimble. Without it
// this is a demo: open times are simulated and nothing is sent anywhere. The site
// itself never stores health card numbers; they are only passed to Bimble.

export const clinicLocation = {
  name: "Abbotsford",
  clinic: "123 Walk-In Clinic",
  address: "108-2777 Gladwin Rd., BC",
  timeZone: "America/Vancouver",
  /** The demo's first open day, this many days from today. */
  daysUntilAvailable: 3,
};

/** Visit methods in the order the booking page offers them. */
export const methods = [
  { id: "video", label: "Video call", short: "Video" },
  { id: "phone", label: "Phone call", short: "Phone" },
  { id: "in-clinic", label: "In clinic", short: "Clinic" },
] as const;
export type MethodId = (typeof methods)[number]["id"];

export const sexOptions = [
  { id: "F", label: "Female" },
  { id: "M", label: "Male" },
  { id: "O", label: "Other" },
  { id: "U", label: "Prefer not to say" },
];

export const provinces = ["BC", "AB", "SK", "MB", "ON", "QC", "NB", "NS", "PE", "NL", "YT", "NT", "NU"];

export const relationOptions = ["Spouse / Partner", "Parent", "Child", "Sibling", "Relative", "Friend", "Caregiver", "Other"];

export type BookingData = {
  // 1 · Your visit
  method: MethodId | "";
  date: string;
  /** Minutes after midnight of the chosen time. */
  time: number | null;
  /** Bimble's slot label ("9:15 AM") and the doctor who has that time. */
  slotTime: string;
  slotDoctorId: number | null;
  /** Bimble doctor id, or "any" for the first available doctor. */
  providerId: string;
  provider: string;
  reason: string;
  /** Bimble service behind the chosen reason (live mode picks reasons from Bimble's list). */
  reasonServiceId: number | null;
  // 2 · Find your record
  hasCard: boolean;
  cardNumber: string;
  email: string;
  /** "MM / DD / YYYY", as typed (month first, as on Bimble). */
  dob: string;
  cellPhone: string;
  // 3 · Your details
  firstName: string;
  lastName: string;
  sex: string;
  addressLine: string;
  unitNumber: string;
  city: string;
  province: string;
  postalCode: string;
  // 4 · Pharmacy
  delivery: "delivery" | "pickup";
  pharmacy: string;
  /** The pharmacy picked from the directory (empty when only a name was typed). */
  pharmacyAddress: string;
  pharmacyCity: string;
  pharmacyPostalCode: string;
  pharmacyPhone: string;
  pharmacyConsent: boolean;
  // 5 · Your health
  /** Optional; "Penicillin, Peanut", sent to Bimble so the doctor sees it. */
  allergies: string;
  noKnownAllergies: boolean;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  notes: string;
  /** In BC for the visit, and the terms & privacy policy accepted. */
  terms: boolean;
};

export const emptyBooking: BookingData = {
  method: "",
  date: "",
  time: null,
  slotTime: "",
  slotDoctorId: null,
  providerId: "any",
  provider: "First available",
  reason: "",
  reasonServiceId: null,
  hasCard: true,
  cardNumber: "",
  email: "",
  dob: "",
  cellPhone: "",
  firstName: "",
  lastName: "",
  sex: "",
  addressLine: "",
  unitNumber: "",
  city: "",
  province: "BC",
  postalCode: "",
  delivery: "pickup",
  pharmacy: "",
  pharmacyAddress: "",
  pharmacyCity: "",
  pharmacyPostalCode: "",
  pharmacyPhone: "",
  pharmacyConsent: false,
  allergies: "",
  noKnownAllergies: false,
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",
  notes: "",
  terms: false,
};

/** "6045550147" / "+1 604 555 0147" → "604-555-0147", formatted as it is typed; at most 10 digits. */
export function formatPhone(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

/** "05151990" → "05 / 15 / 1990", formatted as it is typed. */
export function formatDob(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)} / ${d.slice(2, 4)} / ${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  return d;
}

/** "05 / 15 / 1990" → "1990-05-15", or "" when it is not a real past date. */
export function dobToIso(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 8) return "";
  const month = Number(d.slice(0, 2));
  const day = Number(d.slice(2, 4));
  const year = Number(d.slice(4));
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return "";
  if (year < 1900 || dt.getTime() > Date.now()) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date at the clinic as YYYY-MM-DD. */
export function clinicToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The demo's bookable days, starting when its first availability opens. */
export function availableDates(): string[] {
  const [y, m, d] = clinicToday().split("-").map(Number);
  return Array.from({ length: 8 }, (_, i) => {
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

/** The demo's open times (15-minute steps, 9:00 AM–5:00 PM), stable per date. */
export function availableTimes(date: string, method: string): number[] {
  const times: number[] = [];
  for (let t = 9 * 60; t < 17 * 60; t += 15) if (hash(`${date}-${method}-${t}`) % 10 >= 4) times.push(t);
  return times;
}

/** 615 → "10:15 AM". */
export function timeLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(minutes % 60)} ${h >= 12 ? "PM" : "AM"}`;
}

/** "Today", "Tomorrow" or "Wed 30" for a YYYY-MM-DD date. */
export function dayLabel(date: string) {
  const today = clinicToday();
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return `${new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" })} ${d}`;
}

/** "Monday, September 28" for a YYYY-MM-DD date. */
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

export function methodLabel(id: string) {
  return methods.find((m) => m.id === id)?.label ?? "";
}

export function methodShort(id: string) {
  return methods.find((m) => m.id === id)?.short ?? "";
}

/** Where the visit happens, for the confirmation and the calendar file. */
export function locationLine(b: BookingData) {
  if (b.method === "video") return "Video call – we’ll text you the link before the appointment";
  if (b.method === "phone") return `Phone call – the doctor will call ${b.cellPhone}`;
  return `${clinicLocation.clinic}, ${clinicLocation.address}`;
}

function stamp(date: string, minutes: number) {
  return `${date.replaceAll("-", "")}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

/** An .ics calendar file for the booked appointment (Add to calendar). */
export function calendarFile(b: BookingData) {
  if (b.time === null) return "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//123 Walk-In Clinic//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.date}-${b.time}@123walkin`,
    `DTSTART;TZID=${clinicLocation.timeZone}:${stamp(b.date, b.time)}`,
    `DTEND;TZID=${clinicLocation.timeZone}:${stamp(b.date, b.time + 15)}`,
    `SUMMARY:${clinicLocation.clinic} – ${methodLabel(b.method)}`,
    `LOCATION:${locationLine(b).replaceAll(",", "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
