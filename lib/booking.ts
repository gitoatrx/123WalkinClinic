// Booking flow data and helpers (six short steps, the same flow as Bimble's own booking).
// With Bimble connected (lib/bimble.ts) reasons, doctors, dates and times come
// from the clinic's Bimble schedule and the booking is made in Bimble. Without it
// this is a demo: open times are simulated and nothing is sent anywhere. The site
// itself never stores health card numbers; they are only passed to Bimble.

export const clinicLocation = {
  name: "Abbotsford",
  clinic: "123 Walk-In Clinic",
  address: "108-2777 Gladwin Rd., BC",
  street: "108-2777 Gladwin Rd.",
  timeZone: "America/Vancouver",
  /** The demo's first open day, this many days from today. */
  daysUntilAvailable: 0,
};

/** Visit types the booking page offers, as Bimble names them. The clinic books virtual visits only. */
export const methods = [{ id: "virtual", label: "Virtual", sub: "From anywhere you are" }] as const;
export type MethodId = (typeof methods)[number]["id"];

/** As in Bimble: three buttons; "Others" is saved as "Other". */
export const genderOptions = [
  { id: "M", label: "Male", value: "Male" },
  { id: "F", label: "Female", value: "Female" },
  { id: "O", label: "Others", value: "Other" },
];

export const provinces = ["BC", "AB", "SK", "MB", "ON", "QC", "NB", "NS", "PE", "NL", "YT", "NT", "NU"];

export const relationOptions = ["Spouse / Partner", "Parent", "Child", "Sibling", "Relative", "Friend", "Caregiver", "Other"];

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type BookingData = {
  // 1 · Your visit
  method: MethodId | "";
  // 2 · Doctor & time
  /** "any": the soonest open time with any doctor, booked as is; "choose": a doctor, then a date and time. */
  doctorMode: "" | "any" | "choose";
  /** The doctor the booking is assigned to (chosen, or the one with the soonest time). */
  doctorId: number | null;
  doctorName: string;
  date: string;
  /** Minutes after midnight of the chosen time. */
  time: number | null;
  /** Bimble's slot label ("9:15 AM") and the doctor who has that time. */
  slotTime: string;
  slotDoctorId: number | null;
  /** What the patient sees in the field, e.g. "Sore throat". */
  reason: string;
  /** Bimble service behind the chosen reason (live mode picks reasons from Bimble's list). */
  reasonServiceId: number | null;
  /** Bimble's own name for that reason ("Sick note or medical form"); sent to Bimble. */
  reasonBimble: string;
  /** "Something else": the patient describes the reason in their own words. */
  reasonOther: boolean;
  otherText: string;
  // 2 · Find your record
  hasCard: boolean;
  cardNumber: string;
  email: string;
  /** Date of birth in three boxes, as on Bimble: month "1"–"12", day, 4-digit year. */
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  cellPhone: string;
  // 3 · Your details
  firstName: string;
  lastName: string;
  gender: string;
  addressLine: string;
  unitNumber: string;
  city: string;
  province: string;
  postalCode: string;
  /** From the picked address; Bimble uses them to choose the nearest Bimble Pharmacy. */
  latitude: number | null;
  longitude: number | null;
  // 4 · Pharmacy
  /** Bimble Pharmacy (delivered), or the patient's own pharmacy. */
  pharmacyChoice: "" | "bimble" | "own";
  /** Own pharmacy only: pick up there, or have it delivered. */
  delivery: "" | "delivery" | "pickup";
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
};

export const emptyBooking: BookingData = {
  method: "virtual",
  doctorMode: "",
  doctorId: null,
  doctorName: "",
  date: "",
  time: null,
  slotTime: "",
  slotDoctorId: null,
  reason: "",
  reasonServiceId: null,
  reasonBimble: "",
  reasonOther: false,
  otherText: "",
  hasCard: true,
  cardNumber: "",
  email: "",
  dobMonth: "",
  dobDay: "",
  dobYear: "",
  cellPhone: "",
  firstName: "",
  lastName: "",
  gender: "",
  addressLine: "",
  unitNumber: "",
  city: "",
  province: "BC",
  postalCode: "",
  latitude: null,
  longitude: null,
  pharmacyChoice: "",
  delivery: "",
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
};

/**
 * BC Personal Health Number check, as in Bimble (lib/form-validation.ts): 10 digits, starts with 9,
 * and a Mod-11 check digit (digits 2–9 weighted 2, 4, 8, 5, 10, 9, 7, 3). "" when valid.
 */
export function phnError(value: string) {
  const phn = value.replace(/\D/g, "");
  if (phn.length < 10) return "BC PHNs are 10 digits.";
  if (phn[0] !== "9") return "BC PHNs always start with 9.";
  const weights = [2, 4, 8, 5, 10, 9, 7, 3];
  const sum = weights.reduce((total, w, i) => total + Number(phn[i + 1]) * w, 0);
  const checkDigit = (11 - (sum % 11)) % 11;
  if (checkDigit === 10 || checkDigit !== Number(phn[9])) {
    return "That doesn’t look like a valid BC PHN — please double-check the number on your BC Services Card.";
  }
  return "";
}

/** "6045550147" / "+1 604 555 0147" → "604-555-0147", formatted as it is typed; at most 10 digits. */
export function formatPhone(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

/**
 * Names as Bimble takes them (lib/form-validation.ts normalizeNameInput): letters, spaces,
 * apostrophes and hyphens only, single spaces, and a capital first letter.
 */
export function capitalizeName(value: string) {
  const v = value.replace(/[^\p{L}\s'’-]/gu, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "");
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Month, day and year boxes → "1990-05-15", or "" until all three are filled in. */
export function dobToIso(month: string, day: string, year: string) {
  if (!month || !day || year.length !== 4) return "";
  return `${year}-${pad(Number(month))}-${pad(Number(day))}`;
}

/** What is wrong with the date of birth, in Bimble's words (lib/date-format.ts); "" when it is fine. */
export function dobError(month: string, day: string, year: string) {
  if (!month || !day || year.length !== 4) return "Date of birth is required.";
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  const max = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d < 1 || y < 1900) return "Date of birth must be a real calendar date.";
  if (d > max) return m === 2 ? `February can only have ${max} days.` : `${MONTHS_LONG[m - 1]} can only have ${max} days.`;
  if (Date.UTC(y, m - 1, d) > Date.now()) return "Date of birth cannot be in the future.";
  return "";
}

/** "May 15, 1990" for the review screen. */
export function dobLabel(month: string, day: string, year: string) {
  if (!month || !day || year.length !== 4) return "";
  return `${MONTHS_LONG[Number(month) - 1]} ${Number(day)}, ${year}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date at the clinic as YYYY-MM-DD. */
export function clinicToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Minutes after midnight now, at the clinic. */
export function clinicNowMinutes() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** The demo's bookable days, starting when its first availability opens. */
export function availableDates(): string[] {
  const [y, m, d] = clinicToday().split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
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

/** The demo's open times (15-minute steps, 9:00 AM–8:00 PM), stable per date; today's start 30 minutes from now, as on Bimble. */
export function availableTimes(date: string, method: string): number[] {
  const earliest = date === clinicToday() ? clinicNowMinutes() + 30 : 0;
  const times: number[] = [];
  for (let t = 9 * 60; t < 20 * 60; t += 15) if (t >= earliest && hash(`${date}-${method}-${t}`) % 10 >= 5) times.push(t);
  return times;
}

/** 615 → "10:15 AM". */
export function timeLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(minutes % 60)} ${h >= 12 ? "PM" : "AM"}`;
}

const utc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** A date card as Bimble shows it: weekday, day and month ("THU", "1", "OCT"). */
export function dateParts(date: string) {
  const dt = utc(date);
  return {
    weekday: dt.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }),
    day: dt.getUTCDate(),
    month: dt.toLocaleDateString("en-US", { timeZone: "UTC", month: "short" }),
  };
}

/** "Oct 1" for a YYYY-MM-DD date. */
export function shortDate(date: string) {
  return utc(date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}

/** "Thu, Oct 1" for a YYYY-MM-DD date. */
export function longDate(date: string) {
  return utc(date).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

export function methodLabel(id: string) {
  return methods.find((m) => m.id === id)?.label ?? "";
}

/** Where the visit happens, for the confirmation and the calendar file. */
export function locationLine(b: BookingData) {
  if (b.method === "virtual") return "Virtual visit – the doctor will contact you";
  return `${clinicLocation.clinic}, ${clinicLocation.address}`;
}

/** The clinic's local date and time as a UTC instant (America/Vancouver, daylight saving included). */
function clinicTimeToUtc(date: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const offset = (at: number) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
    const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - at;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}

/** 20261001T163000Z */
function utcStamp(at: Date) {
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** An .ics calendar file for the booked appointment (Add to calendar); only a chosen time has one. */
export function calendarFile(b: BookingData) {
  if (b.time === null) return "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//123 Walk-In Clinic//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.date}-${b.time}@123walkin`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(clinicTimeToUtc(b.date, b.time))}`,
    `DTEND:${utcStamp(new Date(clinicTimeToUtc(b.date, b.time).getTime() + 15 * 60_000))}`,
    `SUMMARY:${clinicLocation.clinic} – ${methodLabel(b.method)} visit`,
    `LOCATION:${locationLine(b).replaceAll(",", "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
