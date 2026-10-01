"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { AllergyInput } from "@/components/booking/AllergyInput";
import { BeforeYourVisit } from "@/components/booking/BeforeYourVisit";
import { Combobox, useSearch } from "@/components/booking/Combobox";
import { Dropdown } from "@/components/booking/Dropdown";
import { Logo } from "@/components/Logo";
import { CalendarIcon, CheckIcon, XIcon } from "@/components/icons";
import {
  bimble,
  BimbleError,
  slotMinutes,
  type BimbleAddressSuggestion,
  type BimbleDoctor,
  type BimblePharmacy,
  type BimbleReason,
  type BimbleSlot,
  type BimbleVisit,
  type BimbleVisitType,
} from "@/lib/bimble";
import {
  availableDates,
  availableTimes,
  calendarFile,
  capitalizeName,
  clinicLocation,
  dateParts,
  dobError,
  dobLabel,
  dobToIso,
  emptyBooking,
  formatPhone,
  genderOptions,
  longDate,
  methodLabel,
  methods,
  MONTHS,
  phnError,
  provinces,
  relationOptions,
  shortDate,
  timeLabel,
  type BookingData,
} from "@/lib/booking";
import { site } from "@/lib/site";
import { cn } from "@/lib/ui";

/**
 * Booking, the same flow as Bimble's own: seven short steps — Your visit (reason, Virtual or In person)
 * → When (As soon as possible, or a Preferred time) → Find your record (a code is texted to the cell phone
 * and entered right below it) → Your details → Pharmacy → Your health → Review → Booked. The patient
 * never picks a doctor: the booking goes to the clinic, which assigns one. Phones get a navy header
 * and a white sheet; wide screens a navy side panel listing the steps.
 *
 * Live mode (Bimble connected): reasons and open times come from the clinic's Bimble schedule;
 * after the code, Bimble checks the health card / email and date of birth against the verified
 * phone (a returning patient must match their record, and their details are filled in); "Book"
 * sends the booking to the clinic in Bimble with no doctor, and the clinic assigns one. Otherwise it is a demo: times are simulated and nothing is sent anywhere.
 */

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "booked";
type Errors = Record<string, string>;

const STEPS = ["Your visit", "Doctor & time", "Find your record", "Your details", "Pharmacy", "Your health", "Review"];
/** Phone header title and subtitle, and side-panel headline and line, per step. */
const COPY: Record<Exclude<Step, "booked">, { title: string; sub: string; headline: string; line: string }> = {
  1: { title: "Book a visit", sub: "Step 1 of 7 · Your visit", headline: "See a doctor today.", line: "Seven short steps. About two minutes." },
  2: { title: "Doctor & time", sub: "Step 2 of 7 · Doctor & time", headline: "Choose your doctor.", line: "Then pick a date and time that suits you." },
  3: { title: "Find your record", sub: "Step 3 of 7 · Find your record", headline: "Find your record.", line: "Just enough to find your record." },
  4: { title: "Your details", sub: "Step 4 of 7 · filled in if you’ve visited before", headline: "Your details.", line: "Been here before? We’ve filled these in — just check them." },
  5: { title: "Your pharmacy", sub: "Step 5 of 7 · where prescriptions go", headline: "Your pharmacy.", line: "Where should your prescription go?" },
  6: { title: "Your health", sub: "Step 6 of 7 · allergies and notes", headline: "Almost done.", line: "Allergies, notes and an emergency contact." },
  7: { title: "Review", sub: "Step 7 of 7 · check and book", headline: "Everything look right?", line: "Check your details, then book." },
};
/** Everyday picks under the reason box, matched to reasons in Bimble's list. */
const QUICK_REASONS: [string, string[]][] = [
  ["Sore throat", ["sore throat", "throat"]],
  ["Cold or flu", ["cold", "flu"]],
  ["Skin or rash", ["skin rash", "rash", "skin"]],
  ["Anxiety", ["anxiety"]],
  // Matched on "opioid", not "oat", which "Sore Throat" also contains.
  ["OAT", ["opioid treatment or substance-use medication support (oat)", "opioid"]],
];
/** The preview's doctors (with Bimble connected, the clinic's doctors who see the chosen reason). */
const DEMO_DOCTORS: BimbleDoctor[] = [
  { id: 1, name: "Dr. Sarah Chen" },
  { id: 2, name: "Dr. Amrit Gill" },
  { id: 3, name: "Dr. Michael Ross" },
];
/** The reason list's last entry: describe it in your own words. */
const OTHER_KEY = "__something-else";
const CODE_LENGTH = 4;
const DRAFT_KEY = "123walkin-booking-draft";
/** Parts of the day for open times, with Bimble's colours. */
const PERIODS = [
  { name: "Morning", until: 12 * 60, color: "#f59e0b" },
  { name: "Afternoon", until: 17 * 60, color: "#f97316" },
  { name: "Evening", until: 24 * 60, color: "#6366f1" },
];

// ---- styles (the design's navy, gold and soft grey) ------------------------------------------
const qText = "mb-2.5 block text-[15px] font-extrabold text-[#14243a] lg:mb-3 lg:text-base";
const field =
  "h-[54px] w-full rounded-[14px] border-0 bg-[#f0f4f7] px-4 text-base text-[#14243a] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a] lg:h-14 lg:px-[18px]";
const boxInput = "w-full border-0 bg-transparent p-0 text-base font-semibold text-[#14243a] outline-none placeholder:font-medium placeholder:text-[#8a9aac]";
/** A grey field as tall as a labelled box (date of birth). */
const tallField =
  "h-[62px] w-full rounded-[14px] border-0 bg-[#f0f4f7] px-4 text-base font-semibold text-[#14243a] outline-none placeholder:font-medium placeholder:text-[#8a9aac] focus:shadow-[inset_0_0_0_2px_#14243a] lg:h-16";
const primary =
  "inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#14243a] px-5 text-base font-bold text-white transition-colors hover:bg-[#1f3552] disabled:opacity-60 lg:h-[58px] lg:px-10";
const gold = "bg-[#c18700] text-[17px] font-extrabold text-[#14243a] hover:bg-[#d09400]";
const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14243a]";
const invalidRing = "shadow-[inset_0_0_0_2px_#c92a2a]";
/** A choice card (visit type, pick up / delivery): gold when chosen. */
const tile = (on: boolean) =>
  cn(
    "flex min-w-0 flex-col items-start gap-1 rounded-[18px] border-2 px-4 py-3.5 text-left transition-colors lg:px-5 lg:py-4",
    on ? "border-[#c18700] bg-[#fbecc4]" : "border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
    ring,
  );

const digits = (s: string) => s.replace(/\D/g, "");
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const validPostalCode = (s: string) => /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(s.trim());
/** City names: letters, spaces, apostrophes, hyphens and periods ("St. Albert"). */
const cleanCity = (s: string) => {
  const v = s.replace(/[^\p{L}\s'’.-]/gu, "").replace(/\s{2,}/g, " ").replace(/^\s+/, "");
  return v.charAt(0).toUpperCase() + v.slice(1);
};
/** In person is a Bimble "clinic" visit; virtual is "virtual". */
/** Every visit is virtual. */
const visitTypeFor = (): BimbleVisitType => "virtual";
/** A doctor's note or a form: no prescription, so no pharmacy is asked for (Bimble's "Doctor's note or form"). */
const isNoteOrForm = (reason: string) => /\b(note|notes|form|forms|letter|certificate)\b/i.test(reason);
const errorText = (e: unknown, fallback: string) => (e instanceof BimbleError ? e.message : fallback);
const tooCloseOrTaken = (status: number, message: string) => status === 409 || (status === 422 && /past|too close/i.test(message));

export function BookingFlow() {
  const live = bimble.live;
  const [b, setB] = useState<BookingData>(emptyBooking);
  const [step, setStep] = useState<Step>(1);
  /** The furthest step finished, so the side panel can offer to edit it. */
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const top = useRef<HTMLDivElement>(null);

  // What Bimble knows about the clinic
  /** Every doctor the clinic offers online: any of them can be booked for any reason. */
  const [allDoctors, setAllDoctors] = useState<BimbleDoctor[]>([]);
  /** The clinic's doctors have loaded (they're asked for once, with no reason attached). */
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  const [visitTypes, setVisitTypes] = useState<string[]>(["virtual", "walkin"]);
  const [reasons, setReasons] = useState<BimbleReason[]>([]);
  const [slots, setSlots] = useState<BimbleSlot[] | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [reference, setReference] = useState("");
  /** After booking: the token and appointment for "Before your visit". */
  const [booked, setBooked] = useState<{ token: string; appointmentId: number | null }>({ token: "", appointmentId: null });
  // Phone verification: the code texted to the patient, what it is for, and the token it unlocks.
  const [otp, setOtp] = useState<{ sessionId: number; maskedPhone: string; devCode: string; phone: string } | null>(null);
  /** A code is being texted in the background (step 3 sends it as soon as the cell phone is complete). */
  const [sending, setSending] = useState(false);
  /** Guards against a second text while one is on its way (state updates arrive a render late). */
  const sendingNow = useRef(false);
  /** The visit Bimble last saved (and holds), per verification: unchanged, Book doesn't send it again. */
  const [savedVisit, setSavedVisit] = useState("");
  /** "Any doctor" times Bimble refused (taken, too close, another booking of theirs): skipped. */
  const [rejected, setRejected] = useState<string[]>([]);
  /** Doctors or reasons failed to load: offer to try again. */
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadTry, setLoadTry] = useState(0);
  /** The latest booking data, for checks after an await. */
  const latestB = useRef(b);
  latestB.current = b;
  /** Shown while the code, the record and the visit are checked; the step moves on by itself after. */
  const [waiting, setWaiting] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<{ phone: string; value: string } | null>(null);
  const [welcome, setWelcome] = useState("");
  const [savedPharmacy, setSavedPharmacy] = useState<BimblePharmacy | null>(null);
  // "Something else": Bimble matches the patient's words to a reason.
  const [matching, setMatching] = useState(false);
  const [matchedFor, setMatchedFor] = useState("");
  const [matchOptions, setMatchOptions] = useState<{ reason: string; serviceId: number }[]>([]);

  /** Fields whose message shows under another name (the three date of birth boxes share one). */
  const errorKey = (k: string) => (k.startsWith("dob") ? "dob" : k === "otherText" ? "reason" : k);
  const set = (patch: Partial<BookingData>) => {
    setB((prev) => ({ ...prev, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[errorKey(k)];
      return next;
    });
  };

  /** The reason is a doctor's note or a form, so the Pharmacy step is skipped. */
  const noPharmacy = isNoteOrForm(b.reasonBimble || b.reason || b.otherText);

  // ---- a refresh keeps what was entered (never the health card number) --------------------------
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Partial<BookingData> | null;
      if (saved) {
        setB({
          ...emptyBooking,
          ...saved,
          // Times move on, and the visit types changed: choose them again.
          method: methods.some((m) => m.id === saved.method) ? saved.method! : "virtual",
          date: "",
          time: null,
          slotTime: "",
          slotDoctorId: null,
          cardNumber: "",
          pharmacyConsent: false,
        });
      }
    } catch {
      // No saved draft, or storage is blocked: start fresh.
    }
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      if (step === "booked") sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...b, cardNumber: "" }));
    } catch {
      // Storage is blocked: the form still works, it just won't survive a refresh.
    }
  }, [b, step]);

  // ---- Bimble: doctors, reasons, open times ----------------------------------------------------
  useEffect(() => {
    if (!live) return;
    let off = false;
    bimble
      .doctors()
      .then((r) => {
        if (off) return;
        setAllDoctors(r.doctors);
        setDoctorsLoaded(true);
        setVisitTypes(r.visitTypes);
      })
      .catch((e) => {
        if (off) return;
        setLoadFailed(true);
        setApiError(errorText(e, "Could not load the clinic’s doctors."));
      });
    bimble
      .reasons()
      .then((r) => !off && setReasons(r))
      .catch((e) => {
        if (off) return;
        setLoadFailed(true);
        setApiError(errorText(e, "Could not load the list of reasons."));
      });
    return () => {
      off = true;
    };
  }, [live, loadTry]);

  // The clinic decides which visit types can be booked online.
  const offeredMethods = useMemo(
    () => (live ? methods.filter(() => visitTypes.includes("virtual")) : methods),
    [live, visitTypes],
  );
  useEffect(() => {
    if (b.method && !offeredMethods.some((m) => m.id === b.method)) set({ method: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeredMethods]);

  const doctorsReady = !live || doctorsLoaded;
  /** A reason is chosen (from Bimble's list, or matched from the patient's words, when live). */
  const reasonChosen = live ? b.reasonServiceId !== null : b.reasonOther ? b.otherText.trim().length >= 3 : b.reason.trim() !== "";
  /** The doctors the patient can choose from: every doctor, whatever the reason (no specialty filter). */
  const doctorChoices = live ? allDoctors : DEMO_DOCTORS;
  /** Open times are shown for the chosen doctor, once the reason and the visit type are chosen. */
  const readyForTimes = reasonChosen && b.method !== "" && b.doctorMode === "choose" && b.doctorId !== null;

  // The chosen doctor's open times over the next days (from their schedule, minus taken times).
  useEffect(() => {
    if (!readyForTimes) {
      setSlots(null);
      return;
    }
    if (!live) {
      setSlots(availableDates().flatMap((date) => availableTimes(date, `${b.method}-${b.doctorId}`).map((t) => ({ date, time: timeLabel(t), doctorId: b.doctorId ?? 0 }))));
      return;
    }
    if (!doctorsReady) {
      setSlots(null);
      return;
    }
    const ids = b.doctorId !== null ? [b.doctorId] : [];
    if (!ids.length) {
      setSlots(allDoctors.length ? [] : null);
      return;
    }
    let off = false;
    setSlots(null);
    bimble
      .slots(ids, visitTypeFor())
      .then((s) => !off && setSlots(s))
      .catch((e) => {
        if (off) return;
        setSlots([]);
        setApiError(errorText(e, "Could not load open times."));
      });
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, readyForTimes, b.method, b.doctorId, doctorsReady, allDoctors.length, slotsVersion]);

  // "Any doctor · soonest first": every doctor's open times, and the soonest is booked as is.
  const [anySlots, setAnySlots] = useState<BimbleSlot[] | null | undefined>(undefined);
  useEffect(() => {
    if (!reasonChosen || !b.method) return;
    if (!live) {
      setAnySlots(
        availableDates()
          .flatMap((date) => DEMO_DOCTORS.flatMap((d) => availableTimes(date, `${b.method}-${d.id}`).map((t) => ({ date, t, doctorId: d.id }))))
          .sort((x, y) => x.date.localeCompare(y.date) || x.t - y.t)
          .map((x) => ({ date: x.date, time: timeLabel(x.t), doctorId: x.doctorId })),
      );
      return;
    }
    if (!doctorsReady) return;
    if (!allDoctors.length) return setAnySlots(null);
    let off = false;
    setAnySlots(undefined);
    bimble
      .slots(
        allDoctors.map((d) => d.id),
        visitTypeFor(),
      )
      .then((s) => !off && setAnySlots(s))
      .catch(() => !off && setAnySlots(null));
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, reasonChosen, b.method, doctorsReady, allDoctors, slotsVersion]);
  const slotKey = (s: { date: string; time: string; doctorId: number | null }) => `${s.date}|${s.time}|${s.doctorId}`;
  /** The soonest time not refused by Bimble; undefined while loading, null when there is none. */
  const soonest = useMemo(
    () => (anySlots === undefined ? undefined : anySlots === null ? null : (anySlots.find((s) => !rejected.includes(slotKey(s))) ?? null)),
    [anySlots, rejected],
  );
  /** Remember a refused "Any doctor" time, so the next soonest is offered instead of the same one. */
  const rejectCurrentAnyTime = () => {
    const now = latestB.current;
    if (now.doctorMode === "any" && now.slotTime) setRejected((r) => [...r, slotKey({ date: now.date, time: now.slotTime, doctorId: now.doctorId })]);
  };
  const soonestDoctor = (s: BimbleSlot) => doctorChoices.find((d) => d.id === s.doctorId)?.name ?? "";
  // "Any doctor": the soonest time and its doctor are the booking (kept up to date if it changes).
  useEffect(() => {
    if (b.doctorMode !== "any" || soonest === undefined) return;
    if (soonest === null) {
      if (b.slotTime) set({ doctorId: null, doctorName: "", date: "", time: null, slotTime: "", slotDoctorId: null });
      return;
    }
    if (b.date === soonest.date && b.slotTime === soonest.time && b.doctorId === soonest.doctorId) return;
    set({
      doctorId: soonest.doctorId,
      doctorName: soonestDoctor(soonest),
      date: soonest.date,
      time: slotMinutes(soonest.time),
      slotTime: soonest.time,
      slotDoctorId: soonest.doctorId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.doctorMode, soonest]);

  /** The clinic has no doctor taking online bookings. */
  const noDoctors = live && doctorsReady && !allDoctors.length;
  const pickSlot = (s: BimbleSlot) => set({ date: s.date, time: slotMinutes(s.time), slotTime: s.time, slotDoctorId: s.doctorId });
  const clearTime = () => set({ date: "", time: null, slotTime: "", slotDoctorId: null });

  // The patient picks the time. One that is no longer open (another visit type or reason) is cleared.
  useEffect(() => {
    if (!b.slotTime || slots === null) return;
    const open = slots.some((s) => s.date === b.date && s.time === b.slotTime);
    if (!open) clearTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  /** Up to a week of open days, as Bimble shows them. */
  const dates = useMemo(() => [...new Set((slots ?? []).map((s) => s.date))].slice(0, 7), [slots]);
  /** The day whose times are shown: the one tapped, else the chosen time's day. Nothing is picked for the patient. */
  const [viewDate, setViewDate] = useState("");
  const shownDate = dates.includes(viewDate) ? viewDate : dates.includes(b.date) ? b.date : "";
  const periodGroups = useMemo(() => {
    const dayTimes = (slots ?? []).filter((s) => s.date === shownDate);
    let from = 0;
    return PERIODS.map((p) => {
      const items = dayTimes.filter((s) => slotMinutes(s.time) >= from && slotMinutes(s.time) < p.until);
      from = p.until;
      return { ...p, items };
    }).filter((g) => g.items.length);
  }, [slots, shownDate]);
  /** The part of the day whose times are shown: the one tapped, else the chosen time's. Nothing is picked for the patient. */
  const [viewPeriod, setViewPeriod] = useState("");
  const chosenPeriod = periodGroups.find((g) => g.items.some((s) => s.date === b.date && s.time === b.slotTime))?.name;
  const shownPeriod = periodGroups.find((g) => g.name === viewPeriod) ?? periodGroups.find((g) => g.name === chosenPeriod);


  // ---- suggestions -------------------------------------------------------------------------------
  const reasonOptions = useMemo(() => {
    // Rank by typed words found, start-of-word matches first, so "sore thr" still finds "Throat concern".
    const words = b.reason.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const score = (label: string) => {
      const l = label.toLowerCase();
      const starts = l.split(/[^a-z0-9]+/);
      return words.reduce((sum, w) => sum + (starts.some((s) => s.startsWith(w)) ? 2 : l.includes(w) ? 1 : 0), 0);
    };
    const list = words.length
      ? reasons
          .map((r) => ({ r, hits: score(r.label) }))
          .filter((x) => x.hits > 0)
          .sort((x, y) => y.hits - x.hits)
          .map((x) => x.r)
      : reasons;
    const options = list.slice(0, 50).map((r) => ({ key: `${r.serviceId}:${r.label}`, label: r.label }));
    return words.length ? [...options, { key: OTHER_KEY, label: "Something else: describe it in your own words" }] : options;
  }, [reasons, b.reason]);
  const quickReasons = useMemo(() => {
    if (!live) return QUICK_REASONS.map(([label]) => ({ label, reason: null as BimbleReason | null }));
    return QUICK_REASONS.flatMap(([label, keys]) => {
      const r =
        reasons.find((x) => keys.some((k) => x.label.toLowerCase() === k)) ?? reasons.find((x) => keys.some((k) => x.label.toLowerCase().includes(k)));
      // The button (and the field) keep the friendly name; Bimble's reason is matched behind it.
      return r ? [{ label, reason: r }] : [];
    });
  }, [live, reasons]);
  const addressSearch = useSearch<BimbleAddressSuggestion>(b.addressLine, bimble.searchAddress, live, 3);
  const pharmacySearch = useSearch<BimblePharmacy>(pharmacyQuery, bimble.searchPharmacies, live, 2);

  /** `shown`: the friendly name to put in the field (a quick button's), else Bimble's own. */
  const chooseReason = (r: BimbleReason, shown = r.label) =>
    set({ reason: shown, reasonServiceId: r.serviceId, reasonBimble: r.label, reasonOther: false });
  const startOther = () => {
    set({ reasonOther: true, reason: "", reasonServiceId: null, reasonBimble: "" });
    setMatchOptions([]);
    setTimeout(() => document.getElementById("otherText")?.focus(), 0);
  };

  /** A match in flight, so a blur and Next share one call (Bimble allows 10 a minute). */
  const matchInFlight = useRef<{ text: string; promise: Promise<Partial<BookingData> | null> } | null>(null);
  /** "Something else": match the patient's words to Bimble's list. Returns what was set, or null. */
  const matchOther = (): Promise<Partial<BookingData> | null> => {
    const text = b.otherText.trim();
    if (!live || text.length < 8) return Promise.resolve(null);
    if (matchedFor === text && b.reasonServiceId !== null) return Promise.resolve({});
    if (matchInFlight.current?.text === text) return matchInFlight.current.promise;
    const promise = runMatch(text);
    matchInFlight.current = { text, promise };
    void promise.finally(() => {
      if (matchInFlight.current?.promise === promise) matchInFlight.current = null;
    });
    return promise;
  };
  const runMatch = async (text: string): Promise<Partial<BookingData> | null> => {
    setMatching(true);
    try {
      const m = await bimble.matchConcern(text);
      // The patient moved on (picked a listed reason, or changed the words): this answer no longer applies.
      const now = latestB.current;
      if (!now.reasonOther || now.otherText.trim() !== text) return null;
      setMatchedFor(text);
      if (m.options.length > 1) {
        setMatchOptions(m.options);
        setErrors((e) => ({ ...e, reason: "Choose the closest match below." }));
        return null;
      }
      setMatchOptions([]);
      const patch = { reasonServiceId: m.serviceId, reasonBimble: m.reason };
      set(patch);
      return patch;
    } catch (e) {
      setErrors((er) => ({ ...er, reason: errorText(e, "We couldn’t match that. Try other words, or pick from the list.") }));
      return null;
    } finally {
      setMatching(false);
    }
  };

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step]);

  // A message from Bimble shows at the top of the form: bring it into view.
  const apiErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (apiError) apiErrorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [apiError]);

  // ---- checks ------------------------------------------------------------------------------------
  const validate = (s: Step, d: BookingData = b): Errors => {
    const e: Errors = {};
    if (s === 1) {
      if (d.reasonOther) {
        if (d.otherText.trim().length < (live ? 8 : 3)) e.reason = "Tell us a little more about what you need help with.";
        else if (live && d.reasonServiceId === null) e.reason = matchOptions.length ? "Choose the closest match below." : "We’re matching your reason. Try Next again.";
      } else if (!d.reason.trim()) e.reason = "Tell us what the visit is for.";
      // Bimble books a reason from its own list, so the doctors and service match.
      else if (live && d.reasonServiceId === null) e.reason = "Choose the closest match from the list.";
      if (!d.method) e.method = "The clinic isn’t taking virtual bookings online right now. Please call the clinic.";
    }
    if (s === 2) {
      if (!d.doctorMode) e.doctorMode = "Choose any doctor, or a doctor of your choice.";
      else if (d.doctorMode === "any") {
        if (!d.slotTime || d.doctorId === null)
          e.doctorMode = soonest === undefined ? "Finding the next available time…" : "No open times right now. Choose a doctor, or call the clinic.";
      } else if (d.doctorId === null) e.doctorId = "Choose a doctor.";
      else if (!d.slotTime || d.time === null) e.time = "Choose a time.";
    }
    if (s === 3) {
      if (d.hasCard) {
        const phn = phnError(d.cardNumber);
        if (phn) e.cardNumber = digits(d.cardNumber) ? phn : "Enter your 10-digit BC health card number.";
      } else if (!validEmail(d.email)) e.email = "Enter a valid email address.";
      const dob = dobError(d.dobMonth, d.dobDay, d.dobYear);
      if (dob) e.dob = dob;
      if (digits(d.cellPhone).length !== 10) e.cellPhone = "Enter a 10-digit cell phone number that can receive texts.";
    }
    if (s === 4) {
      if (!d.firstName.trim()) e.firstName = "First name is required.";
      if (!d.lastName.trim()) e.lastName = "Last name is required.";
      if (!d.gender) e.gender = "Please select a gender option.";
      if (!d.addressLine.trim()) e.addressLine = "Enter your street address.";
      if (!d.city.trim()) e.city = "Enter your city.";
      if (!provinces.includes(d.province)) e.province = "Choose your province.";
      if (!d.postalCode.trim()) e.postalCode = "Enter your postal code.";
      else if (!validPostalCode(d.postalCode)) e.postalCode = "Enter a valid postal code, e.g. V2T 4V1.";
    }
    if (s === 5 && !isNoteOrForm(d.reasonBimble || d.reason || d.otherText)) {
      if (!d.pharmacyChoice) e.pharmacyChoice = "Choose Bimble Pharmacy or your own pharmacy.";
      else if (d.pharmacyChoice === "own") {
        if (!d.delivery) e.delivery = "Choose pick up or delivery.";
        if (!d.pharmacy.trim()) e.pharmacy = "Choose a pharmacy from the list.";
      }
      if (d.pharmacyChoice && !d.pharmacyConsent) e.pharmacyConsent = "Please provide consent before booking this appointment.";
    }
    if (s === 6 && (d.emergencyName.trim() || d.emergencyPhone.trim() || d.emergencyRelation)) {
      if (!d.emergencyName.trim()) e.emergencyName = "Enter their name.";
      if (digits(d.emergencyPhone).length !== 10) e.emergencyPhone = "Enter a 10-digit phone number.";
    }
    return e;
  };

  const finish = (n: number) => setDone((d) => Math.max(d, n));

  // ---- phone verification + identity ------------------------------------------------------------
  const verifiedToken = () => (token && token.phone === b.cellPhone ? token.value : "");
  const dobIso = dobToIso(b.dobMonth, b.dobDay, b.dobYear);
  /** What Bimble last matched to the verified phone; unchanged, there is nothing to check again. */
  const identityKey = () => [b.cellPhone, b.hasCard ? digits(b.cardNumber) : b.email.trim().toLowerCase(), dobIso].join("|");
  const [checkedIdentity, setCheckedIdentity] = useState("");

  /** Identity and visit, as last confirmed by Bimble for a verification. */
  const identityFor = (accessToken: string) => `${accessToken}|${identityKey()}`;
  const visitKey = (accessToken: string) => [accessToken, b.doctorId, b.date, b.slotTime, b.reasonServiceId, reasonForBimble()].join("|");

  const sendCode = async () => {
    const res = await bimble.startPhone(b.cellPhone);
    setOtp({ sessionId: res.intake_session_id, maskedPhone: res.masked_phone, devCode: res.dev_otp ?? "", phone: b.cellPhone });
    setCode("");
    setErrors({});
  };

  const reasonForBimble = () => b.reasonBimble || b.reason.trim() || b.otherText.trim();
  const visitFor = (): BimbleVisit =>
({ visitType: visitTypeFor(), doctorId: b.doctorId ?? 0, date: b.date, time: b.slotTime });

  /**
   * Saves the visit for the verified patient so Bimble checks the time now. A time that is no
   * longer bookable sends the patient back to choose another; false then.
   */
  const saveVisit = async (accessToken: string) => {
    if (!live) return true;
    try {
      await bimble.saveVisit(accessToken, { reason: reasonForBimble(), serviceId: b.reasonServiceId, visit: visitFor() });
      setSavedVisit(visitKey(accessToken));
      return true;
    } catch (e) {
      if (e instanceof BimbleError && e.status === 401) throw e;
      const status = e instanceof BimbleError ? e.status : 0;
      const message = errorText(e, "That time is no longer open. Please choose another time.");
      setApiError(message);
      if (tooCloseOrTaken(status, message)) {
        rejectCurrentAnyTime();
        clearTime();
        setSlotsVersion((v) => v + 1);
      }
      setStep(2);
      return false;
    }
  };

  /**
   * Bimble checks the health card / email and date of birth against the verified phone. A returning
   * patient's saved details fill in the empty fields; a mismatch goes back to step 2 on the right field.
   */
  /**
   * Bimble matches the health card / email and date of birth to the verified phone and returns the
   * saved record; empty fields are filled in from it. False (with the problem shown on step 3) when
   * the details don't match. A 401 (verification expired) is thrown.
   */
  const matchRecord = async (accessToken: string) => {
    try {
      const known = await bimble.checkIdentity(accessToken, { dob: dobIso, phn: b.hasCard ? digits(b.cardNumber) : "", email: b.email.trim() });
      setB((prev) => {
        const keep = (current: string, saved: string) => current.trim() || saved;
        const gender = genderOptions.find((o) => o.value.toLowerCase() === known.gender.toLowerCase() || o.label.toLowerCase() === known.gender.toLowerCase())?.id ?? "";
        return {
          ...prev,
          firstName: capitalizeName(keep(prev.firstName, known.firstName)),
          lastName: capitalizeName(keep(prev.lastName, known.lastName)),
          gender: prev.gender || gender,
          addressLine: keep(prev.addressLine, known.addressLine),
          unitNumber: keep(prev.unitNumber, known.unitNumber),
          city: keep(prev.city, known.city),
          province: provinces.includes(known.province) && !prev.addressLine.trim() ? known.province : prev.province,
          postalCode: keep(prev.postalCode, known.postalCode),
          allergies: keep(prev.allergies, known.allergies),
          ...(known.savedEmergencyContact && !prev.emergencyName.trim()
            ? {
                emergencyName: known.savedEmergencyContact.name,
                emergencyPhone: formatPhone(known.savedEmergencyContact.phone),
                emergencyRelation: relationOptions.includes(known.savedEmergencyContact.relation) ? known.savedEmergencyContact.relation : prev.emergencyRelation,
              }
            : {}),
        };
      });
      setSavedPharmacy(known.savedPharmacy);
      setWelcome(known.existing ? `Welcome back${known.name ? `, ${known.name}` : ""}! We found your record and filled in what we have.` : "");
      setCheckedIdentity(identityFor(accessToken));
      return true;
    } catch (e) {
      if (e instanceof BimbleError && e.status === 401) {
        // The verification expired: text a new code.
        setToken(null);
        throw e;
      }
      // A returning patient's details must match their record: show Bimble's message on the right field.
      const fieldName = e instanceof BimbleError ? e.field : "";
      const message = errorText(e, "We could not confirm your details. Please check them and try again.");
      const key = fieldName === "phn" ? "cardNumber" : fieldName === "emailIfNoPhn" ? "email" : fieldName === "dateOfBirth" ? "dob" : "";
      if (key) setErrors({ [key]: message });
      else setApiError(message);
      setStep(3);
      return false;
    }
  };
  /** Step 3: match the record, save the visit, move on. */
  const checkIdentity = async (accessToken: string) => {
    if (!(await matchRecord(accessToken))) return;
    if (!(await saveVisit(accessToken))) return;
    finish(3);
    setStep(4);
  };

  /** The verification ran out: say so plainly and text a new code. */
  const verificationExpired = () => {
    setToken(null);
    setOtp(null);
    setCode("");
    setApiError("Your verification expired. We’re texting you a new code.");
    void sendInBackground();
  };

  /** Find your record: the phone is verified (the code is texted by itself), then Bimble checks who is booking. */
  const identify = async () => {
    setApiError("");
    // Back to look or edit, and nothing here changed: carry on without asking Bimble again.
    if (verifiedToken() && checkedIdentity === identityFor(verifiedToken())) {
      finish(3);
      setStep(4);
      return;
    }
    const verified = verifiedToken();
    if (!verified) {
      // The code is on its way (the line under the phone says so) or already sent: it only needs entering.
      if (sendingNow.current) return;
      if (otp && otp.phone === b.cellPhone) return showErrors({ code: "Enter the code we texted you." });
      return void sendInBackground();
    }
    setBusy(true);
    setWaiting("Please wait — finding your record…");
    try {
      await checkIdentity(verified);
    } catch (e) {
      if (e instanceof BimbleError && e.status === 401) verificationExpired();
      else setApiError(errorText(e, "Something went wrong. Please try again or call the clinic."));
    } finally {
      setBusy(false);
      setWaiting("");
    }
  };

  /** Texts the code without a button, as soon as the cell phone is complete. */
  const sendInBackground = async () => {
    if (sendingNow.current) return;
    sendingNow.current = true;
    setSending(true);
    setErrors((e) => ({ ...e, cellPhone: "", code: "" }));
    try {
      await sendCode();
    } catch (e) {
      setErrors((er) => ({ ...er, cellPhone: errorText(e, "We couldn’t text a code to this number. Check it and try again.") }));
    } finally {
      sendingNow.current = false;
      setSending(false);
    }
  };
  useEffect(() => {
    if (!live || step !== 3 || digits(b.cellPhone).length !== 10 || sending || verifiedToken()) return;
    if (otp && otp.phone === b.cellPhone) return;
    // A short pause, so a number still being corrected isn't texted.
    const t = setTimeout(() => void sendInBackground(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, step, b.cellPhone, otp, token]);

  // ---- booking ---------------------------------------------------------------------------------
  /** Everything the doctor should see beyond the reason for visit. */
  const visitNotes = () =>
    [
      b.reasonOther && b.otherText.trim() ? `In the patient’s words: ${b.otherText.trim()}` : "",
      b.noKnownAllergies && !b.allergies.trim() ? "No known allergies" : "",
      b.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");

  const book = async (accessToken: string, sendVisit: boolean) => {
    const res = await bimble.book(accessToken, {
      phn: b.hasCard ? digits(b.cardNumber) : "",
      email: b.email.trim(),
      dob: dobIso,
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      gender: genderOptions.find((o) => o.id === b.gender)?.value ?? b.gender,
      address: {
        street: b.addressLine.trim(),
        unit: b.unitNumber.trim(),
        city: b.city.trim(),
        province: b.province,
        postalCode: b.postalCode.trim().toUpperCase(),
        latitude: b.latitude,
        longitude: b.longitude,
      },
      reason: reasonForBimble(),
      serviceId: b.reasonServiceId,
      allergies: b.allergies,
      notes: visitNotes(),
      visit: sendVisit ? visitFor() : undefined,
      pharmacyChoice: noPharmacy ? "none" : b.pharmacyChoice === "bimble" ? "bimble" : "own",
      pharmacy: { name: b.pharmacy, address: b.pharmacyAddress, city: b.pharmacyCity, postalCode: b.pharmacyPostalCode, phone: b.pharmacyPhone },
      delivery: b.pharmacyChoice === "bimble" ? "delivery" : b.delivery,
      pharmacyConsent: b.pharmacyConsent,
      emergencyContact: { name: b.emergencyName, phone: b.emergencyPhone, relation: b.emergencyRelation },
    });
    setB((prev) => ({ ...prev, cardNumber: "" }));
    setReference(String(res.appointment_id));
    setBooked({ token: res.patient_access_token ?? "", appointmentId: res.appointment_id });
    setToken(null);
    setOtp(null);
    finish(7);
    setStep("booked");
  };

  /**
   * Book with a verified phone: first make sure Bimble has matched this record and holds this visit
   * for this verification, then book the time it holds (not sent again, so it isn't re-checked
   * against the 30-minute lead time). A hold that ran out (10 minutes) is saved again, once.
   */
  const bookWith = async (accessToken: string) => {
    if (checkedIdentity !== identityFor(accessToken) && !(await matchRecord(accessToken))) return;
    if (savedVisit !== visitKey(accessToken) && !(await saveVisit(accessToken))) return;
    try {
      await book(accessToken, false);
    } catch (e) {
      const message = e instanceof BimbleError ? e.message : "";
      if (!(e instanceof BimbleError && e.status === 409 && /hold|no longer active|expired/i.test(message))) throw e;
      if (!(await saveVisit(accessToken))) return;
      await book(accessToken, false);
    }
  };

  /** `fromBook`: the booking call failed (the phone was already verified), not sending or checking the code. */
  const handleBookingError = (e: unknown, fromBook: boolean) => {
    const status = e instanceof BimbleError ? e.status : 0;
    const message = errorText(e, "Something went wrong. Please try again or call the clinic.");
    if (!fromBook) return setApiError(message);
    if (status === 401) {
      // The verification expired: the next Book texts a new code.
      setToken(null);
      setApiError("Your verification expired. Press Book again and we’ll text you a new code.");
      setStep(7);
    } else if (status === 409 && /verification code/i.test(message)) {
      // The code was already used: the next Book texts a new one.
      setToken(null);
      setApiError("Please verify your phone again. Press Book and we’ll text you a new code.");
      setStep(7);
    } else if (status === 409 && /PHN|health|date of birth|email|record/i.test(message)) {
      // Bimble uses 409 for identity problems too (a record with this health card or email
      // exists, or its date of birth differs): that is fixed on "Find your record", not by a new time.
      setErrors({ [b.hasCard ? "cardNumber" : "email"]: message });
      setStep(3);
    } else if (tooCloseOrTaken(status, message)) {
      // Someone else just took that time, or it is now too close: choose again from fresh times.
      setApiError(message);
      rejectCurrentAnyTime();
      clearTime();
      setSlotsVersion((v) => v + 1);
      setStep(2);
    } else {
      const fieldName = e instanceof BimbleError ? e.field : "";
      const key = fieldName === "phn" ? "cardNumber" : fieldName === "emailIfNoPhn" ? "email" : fieldName === "dateOfBirth" ? "dob" : "";
      if (key) {
        setErrors({ [key]: message });
        setStep(3);
      } else {
        setApiError(message);
        setStep(7);
      }
    }
  };

  const confirmBook = async () => {
    setApiError("");
    setBusy(true);
    if (!live) {
      await new Promise((r) => setTimeout(r, 700)); // demo: nothing is sent
      setBusy(false);
      setReference("DEMO");
      setBooked({ token: "", appointmentId: null });
      finish(7);
      setStep("booked");
      return;
    }
    // This phone is already verified: book directly.
    const verified = verifiedToken();
    try {
      if (verified) await bookWith(verified);
      else await sendCode();
    } catch (e) {
      handleBookingError(e, Boolean(verified));
    } finally {
      setBusy(false);
    }
  };

  /** The Verify button (or the last digit typed): check the code, then carry on with what it was for. */
  const verifyCode = async (entered = code) => {
    if (!otp) return;
    // A code works once: after it has been accepted, retries reuse the verification.
    let verified = verifiedToken();
    if (!verified && digits(entered).length < CODE_LENGTH) {
      setErrors({ code: "Enter the code we texted you." });
      return;
    }
    const forBooking = step === 7;
    setApiError("");
    setBusy(true);
    setWaiting(forBooking ? "Please wait — checking your code and booking…" : "Please wait — checking your code and finding your record…");
    try {
      if (!verified) {
        try {
          verified = (await bimble.verifyPhone(otp.sessionId, digits(entered))).access_token;
        } catch (e) {
          // A wrong or expired code: say so under the boxes, empty them and start again at the first.
          setErrors({ code: errorText(e, "That code didn’t work. Please try again.") });
          setCode("");
          setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Digit 1"]')?.focus(), 0);
          return;
        }
        setToken({ phone: b.cellPhone, value: verified });
        setOtp(null);
        setCode("");
      }
      if (!forBooking) {
        // The phone is confirmed; the record needs the health card (or email) and date of birth too.
        const missing = validate(3);
        delete missing.cellPhone;
        if (Object.keys(missing).length) return showErrors(missing);
        await checkIdentity(verified);
      } else await bookWith(verified);
    } catch (e) {
      if (forBooking) handleBookingError(e, Boolean(verified));
      else if (e instanceof BimbleError && e.status === 401) verificationExpired();
      else setApiError(errorText(e, "Something went wrong. Please try again or call the clinic."));
    } finally {
      setBusy(false);
      setWaiting("");
    }
  };

  const resendCode = async () => {
    setApiError("");
    setBusy(true);
    try {
      await sendCode();
    } catch (e) {
      setApiError(errorText(e, "Could not send a new code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  // ---- navigation --------------------------------------------------------------------------------
  const showErrors = (e: Errors) => {
    setErrors(e);
    // Show the first problem, wherever it is on the page.
    requestAnimationFrame(() => document.querySelector("main [role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const next = async () => {
    let current = b;
    // "Something else" not matched yet (Next pressed straight from the text box): match it first.
    if (step === 1 && live && b.reasonOther && b.reasonServiceId === null && b.otherText.trim().length >= 8) {
      const patch = await matchOther();
      if (patch) current = { ...b, ...patch };
    }
    const e = validate(step, current);
    if (Object.keys(e).length) return showErrors(e);
    setErrors({});
    setApiError("");
    if (step === 2) {
      // Already verified (back to change the time): save the new choice so Bimble checks it.
      const verified = verifiedToken();
      if (verified) {
        setBusy(true);
        try {
          if (!(await saveVisit(verified))) return;
        } catch {
          setToken(null);
        } finally {
          setBusy(false);
        }
      }
      finish(2);
      setStep(3);
    } else if (step === 3) {
      if (live) void identify();
      else {
        finish(3);
        setStep(4);
      }
    } else if (step === 7) {
      // A change made from Review (e.g. another visit type clears the time) must be finished first.
      // A reason changed from a note or form to something that needs a pharmacy brings Pharmacy back too.
      // Steps reached from the side panel may have been skipped: every step is checked before booking.
      const unfinished = ([1, 2, 3, 4, 5, 6] as const).find((n) => Object.keys(validate(n)).length);
      if (unfinished) {
        setStep(unfinished);
        showErrors(validate(unfinished));
      } else void confirmBook();
    } else if (step === 4 && noPharmacy) {
      // A doctor's note or form: no prescription, so Pharmacy is skipped.
      finish(5);
      setStep(6);
    } else {
      finish(step as number);
      setStep(((step as number) + 1) as Step);
    }
  };
  const back = () => {
    setErrors({});
    setApiError("");
    if (step === 6 && noPharmacy) setStep(4);
    else if (typeof step === "number" && step > 1) setStep((step - 1) as Step);
  };
  /** Go to a finished step (or the next one) from the side panel, the summary pill or Review. */
  const goTo = (n: number) => {
    // Not while a check or booking is running: its result would pull the patient back.
    if (busy) return;
    if (n <= done + 1) {
      setErrors({});
      setApiError("");
      setStep(n as Step);
    }
  };
  const choosePharmacy = (p: BimblePharmacy) => {
    set({ pharmacy: p.name, pharmacyAddress: p.address, pharmacyCity: p.city, pharmacyPostalCode: p.postalCode, pharmacyPhone: p.phone });
    // The search did its job: show just the chosen pharmacy. Typing again brings results back.
    setPharmacyQuery("");
  };
  const clearPharmacy = { pharmacy: "", pharmacyAddress: "", pharmacyCity: "", pharmacyPostalCode: "", pharmacyPhone: "" };

  const downloadCalendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(b)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `123-walk-in-appointment-${b.date}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // ---- summaries -----------------------------------------------------------------------------------
  const reasonShown = b.reasonOther ? b.reasonBimble || b.otherText.trim() : b.reason.trim();
  const when = b.date && b.slotTime ? `${shortDate(b.date)} · ${b.slotTime}` : "";
  const visitSummary = [methodLabel(b.method), when, reasonShown].filter(Boolean).join(" · ");
  /** Side panel: what was chosen on Your visit, and on Doctor & time. */
  const visitOnly = [methodLabel(b.method), reasonShown].filter(Boolean).join(" · ");
  const pharmacyLabel = noPharmacy
    ? "Not needed for a note or form"
    : b.pharmacyChoice === "bimble"
      ? "Bimble Pharmacy · delivery"
      : b.pharmacyChoice === "own" && b.pharmacy
        ? `${b.pharmacy} · ${b.delivery === "delivery" ? "delivery" : "pick up"}`
        : "";
  const genderLabel = genderOptions.find((o) => o.id === b.gender)?.label ?? "";
  const dobShown = dobLabel(b.dobMonth, b.dobDay, b.dobYear);
  const stepSummary = [
    visitOnly,
    [b.doctorMode === "any" ? "Soonest" : "", b.doctorName, when].filter(Boolean).join(" · "),
    [live && verifiedToken() ? "Verified by text" : b.hasCard ? `Health card ••••${digits(b.cardNumber).slice(-4)}` : b.email, dobShown].filter(Boolean).join(" · "),
    [[b.firstName, b.lastName].filter(Boolean).join(" "), b.city].filter(Boolean).join(" · "),
    pharmacyLabel,
    b.allergies.trim() || (b.noKnownAllergies ? "No known allergies" : ""),
    "",
  ];
  const current = step === "booked" ? 8 : step;
  const clinicPhone = site.phone.replace(/^\+1\s*/, "");
  /** After booking: what the patient can expect, in order. */
  const nextSteps: ReactNode[] = [
    <>We’ve texted your confirmation to <b>{b.cellPhone}</b>.</>,
    <>{b.doctorName || "Your doctor"} will contact you at your appointment time for your virtual visit.</>,
    <>
      Need to change or cancel? Call{" "}
      <a href={site.phoneHref} className={cn("font-bold underline", ring)}>
        {clinicPhone}
      </a>
      .
    </>,
  ];
  const bookedTitle = "You’re booked";
  const bookedLine = b.date ? `See you ${longDate(b.date)} at ${b.slotTime}${b.doctorName ? ` with ${b.doctorName}` : ""}.` : "See you soon.";
  const copy = step === "booked" ? null : COPY[step];

  /** Enter the texted code right where the phone number is (no separate screen). */
  const waitBox = waiting && (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-[#fff7e3] px-4 py-3.5 text-[15px] font-semibold text-[#5c4400]">
      <span className="size-5 shrink-0 animate-spin rounded-full border-[2.5px] border-[#e8c46a] border-t-[#14243a]" aria-hidden="true" />
      {waiting}
    </div>
  );
  const codePanel = otp && (
    <div>
      <span className="mb-2 block text-xs font-bold text-[#4a5a6e] lg:text-[13px]">
        Code texted to {otp.maskedPhone}
        {step === 7 ? " — enter it to book" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CodeInput value={code} onChange={(v) => { setCode(v); setErrors((e) => ({ ...e, code: "" })); }} onComplete={(full) => !busy && void verifyCode(full)} invalid={!!errors.code} />
        <button type="button" onClick={resendCode} disabled={busy} className={cn("text-[13px] font-bold text-[#14243a] underline disabled:opacity-50", ring)}>
          Send again
        </button>
      </div>
      {errors.code && <Err>{errors.code}</Err>}
      {otp.devCode && <p className="mx-1 mt-1.5 text-xs text-[#4a5a6e]">Development code: {otp.devCode}</p>}
    </div>
  );
  /** A texted code is waiting to be entered on this screen. */
  const awaitingCode = Boolean(otp) && (step === 3 || step === 7);


  // ---- render --------------------------------------------------------------------------------------
  return (
    <div ref={top} className="min-h-dvh bg-[#14243a] text-[#14243a] lg:flex lg:bg-white">
      {/* Side panel (wide screens) */}
      <aside className="sticky top-0 hidden h-dvh w-[42%] max-w-[720px] min-w-[400px] shrink-0 flex-col gap-9 overflow-y-auto bg-[#14243a] px-11 py-10 text-white lg:flex xl:px-16 2xl:px-24">
        <div className="self-start">
          <Logo onDark size="sm" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[40px] leading-[1.08] font-extrabold tracking-[-0.03em] xl:text-[48px] 2xl:text-[56px]">{copy ? copy.headline : `${bookedTitle}.`}</h1>
          <p className="text-base leading-normal text-[#c8d3de]">{copy ? copy.line : bookedLine}</p>
        </div>
        {step === "booked" ? (
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold tracking-[0.08em] text-[#8fa1b5] uppercase">What happens next</span>
            <ol className="flex flex-col gap-4">
              {nextSteps.map((text, i) => (
                <li key={i} className="flex items-start gap-3.5 text-base leading-normal text-[#e3e9ef] [&_a]:whitespace-nowrap [&_a]:text-white [&_b]:whitespace-nowrap [&_b]:text-white">
                  <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-white/10 text-sm font-extrabold text-[#fbd97a]">{i + 1}</span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {STEPS.map((name, i) => {
              const n = i + 1;
              // A finished step stays ticked (and editable) even after going back to an earlier one.
              const isDone = n !== current && (n < current || n <= done);
              const isCurrent = n === current;
              return (
                <li key={name} className={cn("flex items-start gap-3.5 text-base font-bold", !isDone && !isCurrent && "text-[#8fa1b5]")}>
                  <span
                    className={cn(
                      "grid size-[34px] shrink-0 place-items-center rounded-full text-sm font-extrabold",
                      isDone ? "bg-[#1f7a4a] text-white" : isCurrent ? "bg-[#c18700] text-[#14243a]" : "border-2 border-[#34496a]",
                    )}
                  >
                    {isDone ? <CheckIcon className="size-4" strokeWidth={3} /> : n}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    {name}
                    {isDone && stepSummary[i] && <span className="text-[13px] leading-snug font-medium break-words text-[#c8d3de]">{stepSummary[i]}</span>}
                  </span>
                  {isDone && !(noPharmacy && n === 5) && (
                    <button
                      type="button"
                      onClick={() => goTo(n)}
                      disabled={busy}
                      aria-label={`Edit ${name.toLowerCase()}`}
                      className={cn("ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-[#fbd97a] hover:text-white", ring)}
                    >
                      <PencilIcon />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-auto text-[15px] leading-relaxed text-[#ffd6d6] 2xl:text-base">
          If you are experiencing a medical emergency, please do not book using this site and call 9-1-1 instead.{" "}
          <button type="button" onClick={() => setShowEmergency(true)} className={cn("font-bold underline", ring)}>
            Full list
          </button>
        </p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col max-lg:mx-auto max-lg:w-full max-lg:max-w-[640px]">
        {/* Header (phones) */}
        <header className={cn("flex flex-col gap-3.5 px-5 text-white lg:hidden", step === "booked" ? "items-center pt-14 pb-12 text-center" : "pb-11")}>
          {step !== "booked" && (
            <div className="flex h-[60px] items-center justify-between">
              {step === 1 ? (
                <Logo onDark size="sm" />
              ) : (
                <button type="button" onClick={back} disabled={busy} className={cn("flex h-11 items-center text-sm font-bold", ring)}>
                  ‹ Back
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowEmergency(true)}
                className={cn("flex h-[30px] items-center rounded-full bg-white/12 px-3 text-xs font-bold text-[#ffd6d6]", ring)}
              >
                Emergency? 911
              </button>
            </div>
          )}
          {typeof step === "number" && (
            <div className="flex gap-1.5" aria-hidden="true">
              {STEPS.map((name, i) => (
                <span key={name} className={cn("h-[5px] flex-1 rounded-[3px]", i < step ? "bg-[#c18700]" : "bg-[#34496a]")} />
              ))}
            </div>
          )}
          {step === "booked" && (
            <span className="grid size-[72px] place-items-center rounded-full bg-[#c18700] text-[#14243a]">
              <CheckIcon className="size-9" strokeWidth={2.8} />
            </span>
          )}
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.025em] sm:text-[30px]">{copy ? copy.title : `${bookedTitle}!`}</h1>
          {step === "booked" ? (
            <span className="text-[15px] text-[#c8d3de]">{bookedLine}</span>
          ) : (
            copy?.sub && step !== 3 && <span className="text-sm text-[#c8d3de]">{copy.sub}</span>
          )}
          {typeof step === "number" && step > 1 && visitSummary && (
            <button
              type="button"
              onClick={() => goTo(1)}
              disabled={busy}
              aria-label="Edit your visit"
              className={cn("flex min-h-[34px] max-w-full items-center gap-2 self-start rounded-[17px] bg-white/12 py-1.5 pr-3 pl-3.5 text-left text-[13px] leading-snug font-semibold", ring)}
            >
              <span className="break-words">{visitSummary}</span>
              <span className="text-[#fbd97a]">
                <PencilIcon />
              </span>
            </button>
          )}
        </header>

        {/* The white sheet */}
        <main
          id="main"
          className={cn(
            "-mt-6 flex min-w-0 flex-1 flex-col rounded-t-[28px] bg-white px-5 pt-6 lg:mx-auto lg:mt-0 lg:w-full lg:max-w-[820px] lg:rounded-none lg:px-16 lg:pt-10 lg:pb-8",
            // Booked: the card starts level with the side panel's headline.
            step === "booked" && "lg:pt-[108px]",
          )}
        >
          {!live && (
            <p className="mb-5 rounded-2xl bg-[#fff7e3] px-4 py-3 text-sm text-[#5c4400]">
              <strong>Preview only:</strong> no appointment will be made.{" "}
              <a href="https://123walkin.cortico.ca/book/first-available/?location=123-walk-in-clinic-abbotsford" className="font-bold underline">
                Book for real on Cortico
              </a>
              .
            </p>
          )}
          {apiError && (
            <div ref={apiErrorRef} role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl bg-[#fdecec] px-4 py-3 text-[15px] text-[#9b1c1c]">
              <p>
                {apiError}
                {loadFailed && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => {
                        setLoadFailed(false);
                        setApiError("");
                        setLoadTry((n) => n + 1);
                      }}
                      className={cn("font-bold underline", ring)}
                    >
                      Try again
                    </button>
                  </>
                )}
              </p>
              <button type="button" aria-label="Dismiss" onClick={() => setApiError("")} className={cn("grid size-6 shrink-0 place-items-center rounded-full hover:bg-black/5", ring)}>
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          {/* 1 · Your visit */}
          {step === 1 && (
            <div className="flex flex-col gap-6 lg:gap-8">
              <div>
                <label htmlFor={b.reasonOther ? "otherText" : "reason"} className={qText}>
                  What’s it for?
                </label>
                {b.reasonOther ? (
                  <>
                    <textarea
                      id="otherText"
                      maxLength={300}
                      placeholder="Tell us what you need help with, e.g. follow-up on blood test results"
                      value={b.otherText}
                      onChange={(e) => {
                        set({ otherText: e.target.value, reasonServiceId: null, reasonBimble: "" });
                        setMatchOptions([]);
                      }}
                      onBlur={() => void matchOther()}
                      aria-invalid={!!errors.reason}
                      className={cn(
                        "h-24 w-full resize-none rounded-[14px] border-0 bg-[#f0f4f7] px-4 py-3 text-base text-[#14243a] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a]",
                        errors.reason && invalidRing,
                      )}
                    />
                    <p className="mx-1 mt-1.5 text-xs text-[#4a5a6e] lg:text-[13px]">
                      {matching ? (
                        "Matching your reason…"
                      ) : live && b.reasonServiceId !== null && b.reasonBimble ? (
                        <>
                          We’ll book it as <b className="text-[#14243a]">{b.reasonBimble}</b>.
                        </>
                      ) : (
                        "We’ll match it to the right service. "
                      )}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          set({ reasonOther: false, otherText: "", reasonServiceId: null, reasonBimble: "" });
                          setMatchOptions([]);
                        }}
                        className={cn("font-bold text-[#14243a] underline", ring)}
                      >
                        Pick from the list instead
                      </button>
                    </p>
                    {matchOptions.length > 1 && (
                      <div className="mt-3">
                        <span className="mb-1.5 block text-[13px] font-bold">Which fits best?</span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchOptions.map((o) => {
                            const on = b.reasonServiceId === o.serviceId && b.reasonBimble === o.reason;
                            return (
                              <button
                                key={`${o.serviceId}-${o.reason}`}
                                type="button"
                                aria-pressed={on}
                                onClick={() => set({ reasonServiceId: o.serviceId, reasonBimble: o.reason })}
                                className={cn(
                                  "h-9 rounded-full border px-3.5 text-[13px] font-semibold",
                                  on ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#d5dee6] bg-white text-[#3d4d61] hover:border-[#14243a]",
                                  ring,
                                )}
                              >
                                {o.reason}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : live ? (
                  <Combobox
                    id="reason"
                    value={b.reason}
                    placeholder="Type a symptom or reason"
                    options={reasonOptions}
                    loading={!reasons.length}
                    emptyText="No matching reason. Try another word."
                    invalid={!!errors.reason}
                    className={cn(field, errors.reason && invalidRing)}
                    onChange={(text) => {
                      // Typing keeps the reason only while it still matches a listed one (or a quick button) exactly.
                      const typed = text.trim().toLowerCase();
                      const exact =
                        reasons.find((r) => r.label.toLowerCase() === typed) ?? quickReasons.find((q) => q.label.toLowerCase() === typed)?.reason ?? null;
                      set({ reason: text, reasonServiceId: exact?.serviceId ?? null, reasonBimble: exact?.label ?? "" });
                    }}
                    onPick={(o) => {
                      if (o.key === OTHER_KEY) {
                        const typed = b.reason.trim();
                        startOther();
                        set({ reasonOther: true, reason: "", otherText: typed, reasonServiceId: null, reasonBimble: "" });
                        return;
                      }
                      const r = reasons.find((x) => `${x.serviceId}:${x.label}` === o.key);
                      if (r) chooseReason(r);
                    }}
                  />
                ) : (
                  <input
                    id="reason"
                    placeholder="Type a symptom or reason"
                    value={b.reason}
                    onChange={(e) => set({ reason: e.target.value })}
                    aria-invalid={!!errors.reason}
                    className={cn(field, errors.reason && invalidRing)}
                  />
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5 lg:mt-3 lg:gap-2">
                  {quickReasons.map(({ label, reason }, i) => {
                    const on = !b.reasonOther && b.reason === label && (!reason || b.reasonServiceId === reason.serviceId);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={on}
                        onClick={() => (reason ? chooseReason(reason, label) : set({ reason: label, reasonOther: false }))}
                        className={cn(
                          "h-[34px] rounded-full border px-3 text-[13px] font-semibold lg:h-9 lg:px-3.5",
                          on ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#d5dee6] bg-white text-[#3d4d61] hover:border-[#14243a]",
                          // Phones show four, so the row stays short.
                          i === 2 && "max-lg:hidden",
                          ring,
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={b.reasonOther}
                    onClick={() => (b.reasonOther ? undefined : startOther())}
                    className={cn(
                      "h-[34px] rounded-full border px-3 text-[13px] font-semibold lg:h-9 lg:px-3.5",
                      b.reasonOther ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#d5dee6] bg-white text-[#3d4d61] hover:border-[#14243a]",
                      ring,
                    )}
                  >
                    Something else
                  </button>
                </div>
                {errors.reason && <Err>{errors.reason}</Err>}
              </div>

              {/* Every visit is virtual: shown for information, nothing to choose. */}
              <div>
                <span className="mx-1 mb-1.5 block text-xs font-bold text-[#4a5a6e] lg:text-[13px]">Your visit</span>
                {/* Looks chosen, like a selected tile: it is the only kind of visit. */}
                <div className="flex items-center gap-3 rounded-[18px] border-2 border-[#c18700] bg-[#fbecc4] px-4 py-3.5 lg:px-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#14243a]">
                    <TileIcon />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] lg:text-base">
                    <b>{methodLabel(b.method || "virtual")}</b>
                    <span className="text-[#6b4a00]"> · {methods[0].sub}</span>
                  </span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#14243a] text-white" aria-label="Selected">
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                  </span>
                </div>
                {errors.method && <Err>{errors.method}</Err>}
              </div>
            </div>
          )}

          {/* 2 · Doctor & time */}
          {step === 2 && (
            <div className="flex flex-col gap-6 lg:gap-8">
              <fieldset className="min-w-0">
                <legend className={qText}>Who would you like to see?</legend>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:gap-3">
                  {(
                    [
                      [
                        "any",
                        "Any doctor · soonest first",
                        soonest === undefined
                          ? "Finding the next available time…"
                          : soonest === null
                            ? "No open times this week"
                            : `Next available: ${longDate(soonest.date)} · ${soonest.time}`,
                      ],
                      ["choose", "Choose a doctor", "Pick your doctor, then a date and time"],
                    ] as const
                  ).map(([v, title, sub]) => {
                    const on = b.doctorMode === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          if (on) return;
                          set({ doctorMode: v, doctorId: null, doctorName: "", date: "", time: null, slotTime: "", slotDoctorId: null });
                          setViewDate("");
                          setViewPeriod("");
                        }}
                        className={tile(on)}
                      >
                        <b className="text-[15px] lg:text-base">{title}</b>
                        <span className={cn("text-xs lg:text-[13px]", on ? "text-[#6b4a00]" : "text-[#4a5a6e]")}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.doctorMode && <Err>{errors.doctorMode}</Err>}
              </fieldset>

              {b.doctorMode === "any" && b.slotTime && b.date && (
                <div className="rounded-2xl bg-[#f0f4f7] px-4 py-3.5 lg:px-5">
                  <span className="block text-xs font-bold text-[#4a5a6e] lg:text-[13px]">Your appointment</span>
                  <b className="mt-0.5 block text-[15px] lg:text-base">
                    {longDate(b.date)} · {b.slotTime}
                    {b.doctorName ? ` with ${b.doctorName}` : ""}
                  </b>
                  <span className="mt-0.5 block text-[13px] text-[#4a5a6e]">The soonest open time with any of our doctors.</span>
                </div>
              )}

              {b.doctorMode === "choose" && (
                <>
                <div>
                  <label htmlFor="doctor" className={qText}>
                    Which doctor would you like to see?
                  </label>
                  {noDoctors ? (
                    <p className="rounded-2xl bg-[#f0f4f7] px-4 py-3 text-sm text-[#3d4d61]">No doctor is taking online bookings right now. Please call the clinic.</p>
                  ) : (
                    <Dropdown
                      id="doctor"
                      placeholder={doctorsReady ? "Choose a doctor" : "Finding doctors…"}
                      disabled={!doctorsReady}
                      value={b.doctorId === null ? "" : String(b.doctorId)}
                      options={doctorChoices.map((d) => ({ value: String(d.id), label: d.name }))}
                      onChange={(v) => {
                        const d = doctorChoices.find((x) => String(x.id) === v);
                        if (!d || d.id === b.doctorId) return;
                        set({ doctorId: d.id, doctorName: d.name, date: "", time: null, slotTime: "", slotDoctorId: null });
                        setViewDate("");
                        setViewPeriod("");
                      }}
                      invalid={!!errors.doctorId}
                      className={cn(field, "font-semibold", errors.doctorId && invalidRing, ring)}
                    />
                  )}
                  {errors.doctorId && <Err>{errors.doctorId}</Err>}
                </div>

                <fieldset className="min-w-0">
                  <legend className={qText}>When would you like to be seen?</legend>
                  {(
                    <div>
                      {!readyForTimes ? (
                        <p className="rounded-2xl bg-[#f0f4f7] px-4 py-3 text-sm text-[#3d4d61]">
                          {!reasonChosen ? "Choose what it’s for first, on Your visit." : "Choose a doctor to see their open times."}
                        </p>
                      ) : slots === null ? (
                        <p className="text-sm text-[#4a5a6e]">Finding open times…</p>
                      ) : !dates.length ? (
                        <p className="rounded-2xl bg-[#f0f4f7] px-4 py-3 text-sm text-[#3d4d61]">
                          No open times with {b.doctorName || "this doctor"} this week. Choose another doctor, or call the clinic.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3 lg:gap-4">
                          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2" role="group" aria-label="Date">
                            {dates.map((d) => {
                              const p = dateParts(d);
                              const on = shownDate === d;
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  aria-pressed={on}
                                  aria-label={longDate(d)}
                                  onClick={() => {
                                    setViewDate(d);
                                    setViewPeriod("");
                                  }}
                                  className={cn(
                                    "flex h-[72px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] lg:h-20",
                                    on ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                                    ring,
                                  )}
                                >
                                  <span className={cn("text-[10px] font-bold tracking-wide uppercase", on ? "text-white/80" : "text-[#6b7a8c]")}>{p.weekday}</span>
                                  <span className="text-lg leading-none font-extrabold lg:text-xl">{p.day}</span>
                                  <span className={cn("text-[10px] font-bold tracking-wide uppercase", on ? "text-white/80" : "text-[#6b7a8c]")}>{p.month}</span>
                                </button>
                              );
                            })}
                          </div>
                          {!shownDate && <p className="text-sm text-[#4a5a6e]">Choose a date to see open times.</p>}
                          {shownDate && (
                            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${periodGroups.length}, minmax(0, 1fr))` }}>
                              {periodGroups.map((g) => {
                                const on = shownPeriod?.name === g.name;
                                return (
                                  <button
                                    key={g.name}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => setViewPeriod(g.name)}
                                    style={on ? { backgroundColor: g.color, borderColor: g.color } : { borderColor: `${g.color}55` }}
                                    className={cn("flex h-[84px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] lg:h-[92px]", on ? "text-white" : "bg-white", ring)}
                                  >
                                    <PeriodIcon name={g.name} color={on ? undefined : g.color} />
                                    <span className="text-sm font-bold lg:text-[15px]">{g.name}</span>
                                    <span className={cn("text-xs font-medium", on ? "text-white/85" : "text-[#4a5a6e]")}>
                                      {g.items.length} {g.items.length === 1 ? "slot" : "slots"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {shownDate && !shownPeriod && <p className="text-sm text-[#4a5a6e]">Choose morning, afternoon or evening.</p>}
                          {shownPeriod && (
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {shownPeriod.items.map((s) => {
                                const on = s.date === b.date && s.time === b.slotTime;
                                return (
                                  <button
                                    key={`${s.date}-${s.time}`}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => pickSlot(s)}
                                    className={cn(
                                      "rounded-xl border-[1.5px] px-1 py-2.5 text-sm font-semibold transition-colors",
                                      on ? "border-[#14243a] bg-[#fbecc4] text-[#14243a]" : "border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                                      ring,
                                    )}
                                  >
                                    {s.time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {errors.time && <Err>{errors.time}</Err>}
                    </div>
                  )}
                </fieldset>
                </>
              )}
            </div>
          )}

          {/* 3 · Find your record */}
          {step === 3 && (
            <div className="flex flex-col gap-3.5 lg:gap-[18px]">
              <div>
                {b.hasCard ? (
                  <Box id="cardNumber" label="BC health card" error={errors.cardNumber}>
                    <input
                      id="cardNumber"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="10 digits"
                      value={b.cardNumber}
                      onChange={(e) => {
                        const cardNumber = digits(e.target.value).slice(0, 10);
                        set({ cardNumber });
                        // All 10 digits in: check the number right away, as Bimble does.
                        const problem = cardNumber.length === 10 ? phnError(cardNumber) : "";
                        if (problem) setErrors((er) => ({ ...er, cardNumber: problem }));
                      }}
                      aria-invalid={!!errors.cardNumber}
                      className={boxInput}
                    />
                  </Box>
                ) : (
                  <Box id="email" label="Email" error={errors.email}>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={b.email}
                      onChange={(e) => set({ email: e.target.value })}
                      aria-invalid={!!errors.email}
                      className={boxInput}
                    />
                  </Box>
                )}
                <p className="mx-1 mt-1.5 text-xs text-[#4a5a6e] lg:mt-2 lg:text-[13px]">
                  <button type="button" onClick={() => set({ hasCard: !b.hasCard })} className={cn("font-bold text-[#14243a] underline", ring)}>
                    {b.hasCard ? "No BC health card? Use your email instead" : "Have a BC health card? Use it instead"}
                  </button>
                </p>
              </div>
              <fieldset className="min-w-0">
                <legend className="mx-1 mb-1.5 text-xs font-bold text-[#4a5a6e] lg:text-[13px]">Date of birth</legend>
                <div className="grid grid-cols-[1.5fr_0.8fr_1.1fr] gap-2 lg:gap-2.5">
                  <Dropdown
                    id="dobMonth"
                    ariaLabel="Birth month"
                    placeholder="Month"
                    value={b.dobMonth}
                    options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                    onChange={(dobMonth) => {
                      set({ dobMonth });
                      document.getElementById("dobDay")?.focus();
                    }}
                    invalid={!!errors.dob}
                    className={cn(tallField, errors.dob && invalidRing, ring)}
                  />
                  <input
                    id="dobDay"
                    aria-label="Birth day"
                    inputMode="numeric"
                    autoComplete="bday-day"
                    placeholder="DD"
                    maxLength={2}
                    value={b.dobDay}
                    onChange={(e) => {
                      const dobDay = digits(e.target.value).slice(0, 2);
                      set({ dobDay });
                      if (dobDay.length === 2) document.getElementById("dobYear")?.focus();
                    }}
                    aria-invalid={!!errors.dob}
                    className={cn(tallField, errors.dob && invalidRing)}
                  />
                  <input
                    id="dobYear"
                    aria-label="Birth year"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    placeholder="YYYY"
                    maxLength={4}
                    value={b.dobYear}
                    onChange={(e) => {
                      const dobYear = digits(e.target.value).slice(0, 4);
                      set({ dobYear });
                      // All three in: check the date right away, as Bimble does.
                      const problem = dobYear.length === 4 && b.dobMonth && b.dobDay ? dobError(b.dobMonth, b.dobDay, dobYear) : "";
                      if (problem) setErrors((er) => ({ ...er, dob: problem }));
                    }}
                    aria-invalid={!!errors.dob}
                    className={cn(tallField, errors.dob && invalidRing)}
                  />
                </div>
                {errors.dob && <Err>{errors.dob}</Err>}
              </fieldset>
              <div>
                <Box id="cellPhone" label="Cell phone" error={errors.cellPhone}>
                  <input
                    id="cellPhone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="604-555-0147"
                    value={b.cellPhone}
                    onChange={(e) => {
                      const cellPhone = formatPhone(e.target.value);
                      if (cellPhone !== b.cellPhone && otp) {
                        setOtp(null);
                        setCode("");
                      }
                      set({ cellPhone });
                    }}
                    aria-invalid={!!errors.cellPhone}
                    className={boxInput}
                  />
                </Box>
                {!otp && !waiting && (
                  <p className="mx-1 mt-1.5 text-xs text-[#4a5a6e] lg:mt-2 lg:text-[13px]">
                    {!live
                      ? "Been here before? We’ll fill in the rest."
                      : sending
                        ? "Texting a code to this number…"
                        : verifiedToken()
                          ? "Phone confirmed."
                          : "We’ll text a code to this number to confirm it’s you. Been here before? We’ll fill in the rest."}
                  </p>
                )}
              </div>
              {waiting ? waitBox : codePanel}
            </div>
          )}

          {/* 4 · Your details */}
          {step === 4 && (
            <div className="flex flex-col gap-3 lg:gap-5">
              {welcome && <p className="rounded-2xl bg-[#e8f5ee] px-4 py-3 text-sm font-semibold text-[#1f5c3a]">{welcome}</p>}
              <span className="hidden text-base font-extrabold text-[#14243a] lg:block">About you</span>
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                <Box id="firstName" label="First name" error={errors.firstName}>
                  <input
                    id="firstName"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    value={b.firstName}
                    onChange={(e) => set({ firstName: capitalizeName(e.target.value) })}
                    aria-invalid={!!errors.firstName}
                    className={boxInput}
                  />
                </Box>
                <Box id="lastName" label="Last name" error={errors.lastName}>
                  <input
                    id="lastName"
                    autoComplete="family-name"
                    autoCapitalize="words"
                    value={b.lastName}
                    onChange={(e) => set({ lastName: capitalizeName(e.target.value) })}
                    aria-invalid={!!errors.lastName}
                    className={boxInput}
                  />
                </Box>
              </div>
              <fieldset className="min-w-0">
                <legend className="mx-1 mb-1.5 text-xs font-bold text-[#4a5a6e] lg:text-[13px]">Gender</legend>
                <div className="grid grid-cols-3 gap-2.5 lg:gap-3">
                  {genderOptions.map((o) => {
                    const on = b.gender === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ gender: o.id })}
                        className={cn(
                          // As tall as the name boxes beside it.
                          "h-[62px] rounded-[14px] border-2 text-base font-bold transition-colors lg:h-16",
                          on ? "border-[#c18700] bg-[#fbecc4] text-[#6b4a00]" : errors.gender ? "border-[#c92a2a] bg-white" : "border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                          ring,
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {errors.gender && <Err>{errors.gender}</Err>}
              </fieldset>
              <span className="mt-1 ml-1 block text-xs font-bold text-[#4a5a6e] lg:mt-1.5 lg:ml-0 lg:text-base lg:font-extrabold lg:text-[#14243a]">Home address</span>
              <Box id="addressLine" label="Street address" error={errors.addressLine}>
                {live ? (
                  <Combobox
                    id="addressLine"
                    value={b.addressLine}
                    placeholder="Start typing, then pick from the list"
                    autoComplete="street-address"
                    options={addressSearch.items.map((a) => ({ key: a.placeId, label: a.main, sub: a.secondary }))}
                    loading={addressSearch.loading}
                    emptyText={b.addressLine.trim().length < 3 ? "Keep typing…" : "No matching address. You can type it in."}
                    invalid={!!errors.addressLine}
                    className={boxInput}
                    listClassName="-right-4 -left-4 mt-3"
                    onChange={(text) => set({ addressLine: text, latitude: null, longitude: null })}
                    onPick={(o) => {
                      set({ addressLine: o.label });
                      bimble
                        .addressDetails(o.key)
                        .then((a) =>
                          set({
                            addressLine: a.street || o.label,
                            ...(a.unit ? { unitNumber: a.unit } : {}),
                            ...(a.city ? { city: a.city } : {}),
                            ...(provinces.includes(a.province) ? { province: a.province } : {}),
                            ...(a.postalCode ? { postalCode: a.postalCode } : {}),
                            latitude: a.latitude,
                            longitude: a.longitude,
                          }),
                        )
                        .catch(() => {}); // the patient can still fill in the rest by hand
                    }}
                  />
                ) : (
                  <input id="addressLine" autoComplete="street-address" placeholder="123 Main St" value={b.addressLine} onChange={(e) => set({ addressLine: e.target.value })} aria-invalid={!!errors.addressLine} className={boxInput} />
                )}
              </Box>
              <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                <Box
                  id="unitNumber"
                  label={
                    <>
                      Unit <span className="font-medium">(optional)</span>
                    </>
                  }
                >
                  <input id="unitNumber" placeholder="#" value={b.unitNumber} onChange={(e) => set({ unitNumber: e.target.value })} className={boxInput} />
                </Box>
                <Box id="city" label="City" error={errors.city}>
                  <input id="city" autoComplete="address-level2" placeholder="Abbotsford" value={b.city} onChange={(e) => set({ city: cleanCity(e.target.value) })} aria-invalid={!!errors.city} className={boxInput} />
                </Box>
                <Box id="province" label="Province" error={errors.province}>
                  <Dropdown
                    id="province"
                    anchored
                    value={b.province}
                    options={provinces.map((p) => ({ value: p, label: p }))}
                    onChange={(v) => set({ province: v })}
                    invalid={!!errors.province}
                    className="text-base font-semibold text-[#14243a] outline-none"
                  />
                </Box>
                <Box id="postalCode" label="Postal code" error={errors.postalCode}>
                  <input
                    id="postalCode"
                    autoComplete="postal-code"
                    maxLength={7}
                    placeholder="V2T 4V1"
                    value={b.postalCode}
                    onChange={(e) => set({ postalCode: e.target.value.toUpperCase() })}
                    aria-invalid={!!errors.postalCode}
                    className={boxInput}
                  />
                </Box>
              </div>
            </div>
          )}

          {/* 5 · Pharmacy */}
          {step === 5 && (
            <div className="flex flex-col gap-5 lg:gap-6">
              <div>
                <span className={qText}>How do you want your prescription?</span>
                <button
                  type="button"
                  aria-pressed={b.pharmacyChoice === "bimble"}
                  onClick={() => b.pharmacyChoice !== "bimble" && set({ pharmacyChoice: "bimble", delivery: "delivery", ...clearPharmacy, pharmacyConsent: false })}
                  className={cn(tile(b.pharmacyChoice === "bimble"), "w-full flex-row items-center gap-3.5 py-4 lg:py-[18px]")}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#14243a] text-white">
                    <TruckIcon />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <b className="text-base lg:text-[17px]">Bimble Pharmacy</b>
                    <span className={cn("text-[13px]", b.pharmacyChoice === "bimble" ? "text-[#6b4a00]" : "text-[#4a5a6e]")}>Fastest delivery available.</span>
                  </span>
                </button>
                {errors.pharmacyChoice && <Err>{errors.pharmacyChoice}</Err>}
              </div>
              <div className="flex items-center gap-3 text-[13px] font-semibold text-[#6b7a8c] before:h-px before:flex-1 before:bg-[#e1e8ee] after:h-px after:flex-1 after:bg-[#e1e8ee]">
                Or your own pharmacy
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                  {(
                    [
                      ["pickup", "Pick up", "at the pharmacy"],
                      ["delivery", "Delivery", "from your pharmacy"],
                    ] as const
                  ).map(([v, title, sub]) => {
                    const on = b.pharmacyChoice === "own" && b.delivery === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ pharmacyChoice: "own", delivery: v, ...(b.pharmacyChoice !== "own" ? { pharmacyConsent: false } : {}) })}
                        className={tile(on)}
                      >
                        <b className="text-[15px] lg:text-base">{title}</b>
                        <span className={cn("text-xs lg:text-[13px]", on ? "text-[#6b4a00]" : "text-[#4a5a6e]")}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.delivery && <Err>{errors.delivery}</Err>}
              </div>
              {b.pharmacyChoice === "own" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="pharmacySearch" className={qText}>
                    Which pharmacy?
                  </label>
                  <div className="relative">
                    <SearchIcon />
                    <input
                      id="pharmacySearch"
                      placeholder={live ? "Search name, street or city" : "Pharmacy name and city"}
                      value={live ? pharmacyQuery : b.pharmacy}
                      onChange={(e) => (live ? setPharmacyQuery(e.target.value) : set({ pharmacy: e.target.value }))}
                      aria-invalid={!!errors.pharmacy}
                      className={cn(field, "pl-11 lg:pl-12", errors.pharmacy && invalidRing)}
                    />
                  </div>
                  {live &&
                    (() => {
                      const typed = pharmacyQuery.trim();
                      const results = typed.length >= 2 ? pharmacySearch.items.slice(0, 5) : [];
                      const selectedCard: BimblePharmacy | null = b.pharmacy
                        ? { id: "selected", name: b.pharmacy, address: b.pharmacyAddress, city: b.pharmacyCity, province: "", postalCode: b.pharmacyPostalCode, phone: b.pharmacyPhone }
                        : null;
                      const same = (p: BimblePharmacy) => p.name === b.pharmacy && p.address === b.pharmacyAddress;
                      const list: BimblePharmacy[] = [];
                      if (selectedCard) list.push(selectedCard);
                      if (savedPharmacy && !(selectedCard && savedPharmacy.name === selectedCard.name)) list.push(savedPharmacy);
                      for (const p of results) if (!list.some((x) => x.name === p.name && x.address === p.address)) list.push(p);
                      return (
                        <>
                          {list.map((p) => {
                            const on = same(p);
                            const lastTime = savedPharmacy && p.name === savedPharmacy.name && p.address === savedPharmacy.address;
                            return (
                              <button
                                key={`${p.id}-${p.name}-${p.address}`}
                                type="button"
                                aria-pressed={on}
                                onClick={() => (on ? set(clearPharmacy) : choosePharmacy(p))}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left lg:px-4 lg:py-3.5",
                                  on ? "border-2 border-[#c18700] bg-[#fbecc4]" : "border-[1.5px] border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                                  ring,
                                )}
                              >
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <b className="text-[15px] lg:text-base">{p.name}</b>
                                  <small className="truncate text-xs text-[#4a5a6e] lg:text-[13px]">
                                    {[p.address, p.city].filter(Boolean).join(", ") || "Address not listed"}
                                    {lastTime ? " · used last time" : ""}
                                  </small>
                                </span>
                                {on && (
                                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#14243a] text-white">
                                    <CheckIcon className="size-3.5" strokeWidth={3} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {typed.length >= 2 && pharmacySearch.loading && !results.length && <p className="px-1 text-sm text-[#4a5a6e]">Searching pharmacies…</p>}
                          {typed.length >= 2 && !pharmacySearch.loading && !results.length && (
                            <button
                              type="button"
                              onClick={() => {
                                set({ ...clearPharmacy, pharmacy: typed });
                                setPharmacyQuery("");
                              }}
                              className={cn("rounded-[14px] border-[1.5px] border-dashed border-[#9fb0c2] px-3.5 py-3 text-left text-sm", ring)}
                            >
                              {pharmacySearch.failed ? "Pharmacy search isn’t available right now. " : "No matching pharmacy. "}
                              <b className="text-[#14243a]">Use “{typed}”</b>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  {errors.pharmacy && <Err>{errors.pharmacy}</Err>}
                </div>
              )}
              {b.pharmacyChoice && (
                <div>
                  <label className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-[#3d4d61] lg:text-sm">
                    <input
                      type="checkbox"
                      checked={b.pharmacyConsent}
                      onChange={(e) => set({ pharmacyConsent: e.target.checked })}
                      className="m-0 mt-px size-5 shrink-0 accent-[#14243a]"
                    />
                    <span>
                      I consent to the clinic securely sending my prescription and required information to{" "}
                      {b.pharmacyChoice === "bimble" ? "Bimble Pharmacy" : "my selected pharmacy"}.
                    </span>
                  </label>
                  {errors.pharmacyConsent && <Err>{errors.pharmacyConsent}</Err>}
                </div>
              )}
            </div>
          )}

          {/* 6 · Your health */}
          {step === 6 && (
            <div className="flex flex-col gap-[18px] lg:gap-7">
              <div>
                <label htmlFor="allergies" className={qText}>
                  Any allergies? <span className="text-[13px] font-medium text-[#4a5a6e]">(optional)</span>
                </label>
                <AllergyInput
                  id="allergies"
                  value={b.allergies}
                  onChange={(allergies) => set({ allergies })}
                  noneKnown={b.noKnownAllergies}
                  onNoneKnown={(noKnownAllergies) => set({ noKnownAllergies })}
                  search={bimble.searchAllergies}
                  enabled={live}
                />
              </div>
              <fieldset className="min-w-0">
                <legend className={qText}>
                  Emergency contact <span className="text-[13px] font-medium text-[#4a5a6e]">(optional)</span>
                </legend>
                <div className="flex flex-col gap-2 lg:gap-2.5">
                  <input
                    aria-label="Emergency contact name"
                    placeholder="Name"
                    value={b.emergencyName}
                    onChange={(e) => set({ emergencyName: capitalizeName(e.target.value) })}
                    aria-invalid={!!errors.emergencyName}
                    className={cn(field, errors.emergencyName && invalidRing)}
                  />
                  {errors.emergencyName && <Err>{errors.emergencyName}</Err>}
                  <div className="grid gap-2 sm:grid-cols-2 lg:gap-2.5">
                    <Dropdown
                      ariaLabel="Relationship"
                      placeholder="Relationship"
                      value={b.emergencyRelation}
                      options={relationOptions.map((r) => ({ value: r, label: r }))}
                      onChange={(v) => set({ emergencyRelation: v })}
                      className={cn(field, "font-semibold", ring)}
                    />
                    <input
                      aria-label="Emergency contact phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Phone"
                      value={b.emergencyPhone}
                      onChange={(e) => set({ emergencyPhone: formatPhone(e.target.value) })}
                      aria-invalid={!!errors.emergencyPhone}
                      className={cn(field, errors.emergencyPhone && invalidRing)}
                    />
                  </div>
                  {errors.emergencyPhone && <Err>{errors.emergencyPhone}</Err>}
                </div>
              </fieldset>
              <div>
                <label htmlFor="notes" className={qText}>
                  Note for the doctor <span className="text-[13px] font-medium text-[#4a5a6e]">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  maxLength={1000}
                  placeholder="When it started, what you’ve tried, anything else the doctor should know"
                  value={b.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  className="h-24 w-full resize-none rounded-[14px] border-0 bg-[#f0f4f7] px-4 py-3 text-[15px] text-[#14243a] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a] lg:h-28"
                />
                <p className="mx-1 mt-1 text-right text-xs text-[#6b7a8c] tabular-nums">{b.notes.length} / 1000</p>
              </div>
            </div>
          )}

          {/* 7 · Review */}
          {step === 7 && (
            <dl className="rounded-3xl border-[1.5px] border-[#e1e8ee] px-5 py-1 lg:px-7">
              {(
                [
                  ["Reason", reasonShown, "", 1],
                  ["Visit", methodLabel(b.method), "The doctor contacts you", 1],
                  ["Doctor", b.doctorName, b.doctorMode === "any" ? "Any doctor, soonest first" : "", 2],
                  ["When", b.date ? `${longDate(b.date)} · ${b.slotTime}` : "", "", 2],
                  ["Patient", [b.firstName, b.lastName].filter(Boolean).join(" "), [genderLabel, dobShown].filter(Boolean).join(" · "), 4],
                  [b.hasCard ? "Health card" : "Email", b.hasCard ? b.cardNumber : b.email, "", 3],
                  ["Cell phone", b.cellPhone, "", 3],
                  ["Address", [b.unitNumber ? `${b.unitNumber}-${b.addressLine}` : b.addressLine, b.city, `${b.province} ${b.postalCode.toUpperCase()}`].filter((x) => x.trim()).join(", "), "", 4],
                  ...(noPharmacy
                    ? []
                    : ([["Pharmacy", pharmacyLabel, b.pharmacyChoice === "own" ? [b.pharmacyAddress, b.pharmacyCity].filter(Boolean).join(", ") : "", 5]] as const)),
                  ["Allergies", b.allergies.trim() || "No known allergies", "", 6],
                  ["Emergency contact", b.emergencyName.trim() ? `${b.emergencyName}${b.emergencyRelation ? ` (${b.emergencyRelation})` : ""} · ${b.emergencyPhone}` : "None", "", 6],
                  ...(b.notes.trim() ? ([["Note", b.notes.trim().length > 90 ? `${b.notes.trim().slice(0, 90)}…` : b.notes.trim(), "", 6]] as const) : []),
                ] as const
              ).map(([k, v, sub, go], i) => (
                <div
                  key={k}
                  className={cn("grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 py-3.5 sm:grid-cols-[150px_1fr_auto] lg:grid-cols-[170px_1fr_auto]", i > 0 && "border-t border-[#e8eef2]")}
                >
                  <dt className="text-sm text-[#4a5a6e] max-sm:col-span-2">{k}</dt>
                  <dd className="min-w-0 text-[15px] font-bold break-words lg:text-base">
                    {v || "—"}
                    {sub && <span className="block text-[13px] font-medium text-[#4a5a6e]">{sub}</span>}
                  </dd>
                  <button type="button" onClick={() => goTo(go)} disabled={busy} className={cn("text-[13px] font-bold underline disabled:opacity-50", ring)}>
                    Change
                  </button>
                </div>
              ))}
            </dl>
          )}

          {/* Booked */}
          {step === "booked" && (
            <div className="flex flex-col gap-6">
              <section className="rounded-3xl border-[1.5px] border-[#e1e8ee] px-5 py-2 lg:px-7 lg:py-3">
                <div className="flex items-center justify-between gap-3 pt-3 pb-1 lg:pt-4">
                  <h2 className="text-xs font-bold tracking-[0.08em] text-[#4a5a6e] uppercase">Appointment details</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-bold text-[#1f7a4a]">
                    <CheckIcon className="size-3.5" strokeWidth={3} /> Confirmed
                  </span>
                </div>
                {(
                  [
                    ["Type", methodLabel(b.method)],
                    ["Doctor", b.doctorName],
                    ["When", b.date ? `${longDate(b.date)} · ${b.slotTime}` : ""],
                    ["Reason", reasonShown],
                    ["Pharmacy", pharmacyLabel],
                    ["Reference", reference ? `#${reference}` : ""],
                  ] as const
                ).map(([k, v], i) => (
                  <div key={k} className={cn("grid grid-cols-[96px_1fr] gap-4 py-3.5 text-[15px] lg:grid-cols-[120px_1fr] lg:text-base", i > 0 && "border-t border-[#e8eef2]")}>
                    <span className="text-[#4a5a6e]">{k}</span>
                    <span className="text-right font-bold break-words">{v}</span>
                  </div>
                ))}
              </section>
              <div className="flex flex-col gap-3 lg:hidden">
                <span className="text-xs font-bold tracking-[0.08em] text-[#4a5a6e] uppercase">What happens next</span>
                <ol className="flex flex-col gap-3">
                  {nextSteps.map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] leading-normal text-[#3d4d61] [&_a]:whitespace-nowrap [&_b]:whitespace-nowrap [&_b]:text-[#14243a]">
                      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#fbecc4] text-[13px] font-extrabold text-[#14243a]">{i + 1}</span>
                      <span className="pt-0.5">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <BeforeYourVisit token={booked.token} appointmentId={booked.appointmentId} />
            </div>
          )}

          {/* Actions */}
          <div
            className={cn(
              "sticky bottom-0 z-10 -mx-5 mt-auto bg-white px-5 pt-3.5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-10px_16px_-14px_rgb(20_36_58/0.35)] lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:shadow-none",
              // Booked: the buttons sit right under the details, not at the foot of the page.
              step === "booked" ? "lg:mt-0 lg:pt-6" : "lg:pt-10",
            )}
          >
            {step === 7 && (waiting ? <div className="mb-4">{waitBox}</div> : otp && <div className="mb-4">{codePanel}</div>)}
            {step === "booked" ? (
              <div className="flex flex-col gap-2.5 lg:flex-row lg:justify-between">
                {b.date && (
                  <button type="button" onClick={downloadCalendar} className={cn("inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f0f4f7] px-6 text-base font-bold hover:bg-[#e4eaef] lg:h-[58px]", ring)}>
                    <CalendarIcon className="size-[18px]" /> Add to calendar
                  </button>
                )}
                <Link href="/" className={cn(primary, "lg:ml-auto", ring)}>
                  Done
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-5">
                {step !== 1 && (
                  <button type="button" onClick={back} disabled={busy} className={cn("hidden text-[15px] font-bold lg:inline", ring)}>
                    ← Back
                  </button>
                )}
                {step <= 2 && visitSummary && (
                  // Everything chosen so far, next to Next: visit type, day and time, reason.
                  <span className="hidden min-w-0 flex-1 text-right text-sm leading-snug text-[#4a5a6e] lg:block">{visitSummary}</span>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={awaitingCode ? () => void verifyCode() : () => void next()}
                  className={cn(primary, "w-full lg:ml-auto lg:w-auto", step <= 2 && "max-lg:justify-between", step === 7 && gold, ring)}
                >
                  {step <= 2 ? (
                    <>
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[#c8d3de] lg:hidden">{visitSummary}</span>
                      <span>{matching ? "Matching…" : busy ? "Please wait…" : "Next →"}</span>
                    </>
                  ) : awaitingCode ? (
                    busy ? "Please wait…" : step === 7 ? "Verify and book" : "Next →"
                  ) : step === 3 ? (
                    busy ? "Please wait…" : "Next →"
                  ) : step === 5 ? (
                    "Next · Your health →"
                  ) : step === 6 ? (
                    "Review →"
                  ) : step === 7 ? (
                    busy ? "Booking…" : `Book ${b.date ? `${shortDate(b.date)}, ` : ""}${b.slotTime}`
                  ) : (
                    "Next →"
                  )}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {showEmergency && <EmergencyDialog onClose={() => setShowEmergency(false)} />}
    </div>
  );
}

// ---- pieces -----------------------------------------------------------------------------------------

/** A field with its label inside a soft grey box, as in the design. */
function Box({ id, label, error, className, children }: { id: string; label: ReactNode; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <div
        className={cn(
          "relative flex h-[62px] flex-col justify-center gap-0.5 rounded-[14px] bg-[#f0f4f7] px-4 focus-within:shadow-[inset_0_0_0_2px_#14243a] lg:h-[64px]",
          error && invalidRing,
        )}
      >
        <label htmlFor={id} className="text-xs font-bold text-[#4a5a6e]">
          {label}
        </label>
        {children}
      </div>
      {error && <Err>{error}</Err>}
    </div>
  );
}

function Err({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mx-1 mt-1.5 text-[13px] font-semibold text-[#b42318]">
      {children}
    </p>
  );
}

/** One box per digit; typing moves along, Backspace moves back, pasting fills them all. */
function CodeInput({ value, onChange, onComplete, invalid }: { value: string; onChange: (v: string) => void; onComplete: (code: string) => void; invalid: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");
  const update = (next: string) => {
    const v = next.replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(v);
    if (v.length === CODE_LENGTH) onComplete(v);
  };
  return (
    <div className="flex gap-2">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? CODE_LENGTH : 1}
          value={c}
          autoFocus={i === 0}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) {
              update(value.slice(0, i) + value.slice(i + 1));
              return;
            }
            // The first box also takes a whole code (autofill from the text message).
            if (typed.length > 1) {
              update(typed);
              refs.current[Math.min(typed.length, CODE_LENGTH) - 1]?.focus();
              return;
            }
            update((value.slice(0, i) + typed + value.slice(i + 1)).slice(0, CODE_LENGTH));
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !c && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
            if (!pasted) return;
            update(pasted);
            refs.current[Math.min(pasted.length, CODE_LENGTH) - 1]?.focus();
          }}
          className={cn(
            "size-12 rounded-xl border-0 bg-[#f0f4f7] text-center text-xl font-extrabold text-[#14243a] outline-none focus:shadow-[inset_0_0_0_2px_#14243a]",
            invalid && invalidRing,
          )}
        />
      ))}
    </div>
  );
}

/** The clinic's "Please Note" list: what is an emergency, and what this clinic does not handle online. */
function EmergencyDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#14243a]/60 p-4" role="dialog" aria-modal="true" aria-labelledby="emergency-title" onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-3xl bg-white p-6 text-[15px] text-[#14243a] shadow-xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="emergency-title" className="text-xl font-extrabold">
            Is it an emergency?
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} autoFocus className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-[#f0f4f7]", ring)}>
            <XIcon className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[#3d4d61]">If you have any of these, go to your local Emergency Department or call 911:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[#3d4d61]">
          <li>Chest pain (of any kind or severity)</li>
          <li>Difficulty breathing</li>
          <li>Severe infections</li>
          <li>Fever in children under the age of 6 months</li>
          <li>Blackouts or feeling like you may blackout</li>
          <li>Any impairment in level of consciousness</li>
          <li>Stroke like symptoms such as impaired sensation, paralysis, inability to speak, or comprehend language</li>
          <li>Any abdominal pain severe enough that you are unable to comfortably walk</li>
          <li>Broken bones</li>
          <li>Any other condition which you feel requires emergent attention</li>
        </ul>
        <p className="mt-4 text-[#3d4d61]">
          You must be located in British Columbia to see a healthcare provider at {clinicLocation.clinic}. It is NOT for ICBC or work-related injuries, prolonged
          absence/disability forms, or controlled prescriptions (e.g. sedatives, opioids, or stimulants including ADHD medications). Some issues are not appropriate
          for virtual care (e.g. ear problems or persistent vertigo).
        </p>
        <a href="tel:911" className={cn(primary, "mt-6 w-full bg-[#b42318] hover:bg-[#9b1c1c]", ring)}>
          Call 911
        </a>
      </div>
    </div>
  );
}

/** Icon for the visit-type card. */
function TileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3z" />
    </svg>
  );
}

/** Sunrise, sun and moon for the parts of the day, as on Bimble. */
function PeriodIcon({ name, color }: { name: string; color?: string }) {
  const common = { viewBox: "0 0 24 24", className: "size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]", style: color ? { color } : undefined, "aria-hidden": true };
  if (name === "Morning")
    return (
      <svg {...common}>
        <path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4" />
      </svg>
    );
  if (name === "Afternoon")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 fill-none stroke-[#6b7a8c] stroke-2 [stroke-linecap:round]">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
