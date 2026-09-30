"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { AllergyInput } from "@/components/booking/AllergyInput";
import { Combobox, useSearch } from "@/components/booking/Combobox";
import { Dropdown } from "@/components/booking/Dropdown";
import { Logo } from "@/components/Logo";
import { CalendarIcon, CheckIcon, ChevronDownIcon, XIcon } from "@/components/icons";
import {
  bimble,
  BimbleError,
  slotMinutes,
  type BimbleAddressSuggestion,
  type BimbleDoctor,
  type BimblePharmacy,
  type BimbleReason,
  type BimbleSlot,
  type BimbleVisitType,
} from "@/lib/bimble";
import {
  availableDates,
  availableTimes,
  calendarFile,
  clinicLocation,
  dayLabel,
  dobError,
  dobToIso,
  emptyBooking,
  formatDob,
  formatPhone,
  phnError,
  methodLabel,
  methods,
  methodShort,
  provinces,
  relationOptions,
  sexOptions,
  timeLabel,
  type BookingData,
} from "@/lib/booking";
import { site } from "@/lib/site";
import { cn } from "@/lib/ui";

/**
 * Booking, "Short & Friendly": five short steps — Your visit → Find your record (a code is texted
 * to the cell phone and entered right below it) → Your details → Pharmacy → Your health → Booked. Phones get a navy header and
 * a white sheet; wide screens a navy side panel listing the steps.
 *
 * Live mode (Bimble connected): reasons, doctors and open times come from the clinic's Bimble
 * schedule; after the code, Bimble checks the health card / email and date of birth against the
 * verified phone (a returning patient must match their record, and their details are filled in);
 * "Book" books the appointment into the clinic in Bimble. Otherwise it is a demo: times are
 * simulated and nothing is sent anywhere.
 */

type Step = 1 | 2 | 3 | 4 | 5 | "booked";
type Errors = Record<string, string>;

const STEPS = ["Your visit", "Find your record", "Your details", "Pharmacy", "Your health"];
/** Phone header title and subtitle, and side-panel headline and line, per step. */
const COPY: Record<Exclude<Step, "booked">, { title: string; sub: string; headline: string; line: string }> = {
  1: { title: "Book a visit", sub: "Step 1 of 5 · Your visit", headline: "See a doctor today.", line: "Five short steps. About two minutes." },
  2: { title: "Find your record", sub: "Step 2 of 5 · Find your record", headline: "Find your record.", line: "Just enough to find your record." },
  3: { title: "Your details", sub: "Step 3 of 5 · filled in if you’ve visited before", headline: "Your details.", line: "Been here before? We’ve filled these in — just check them." },
  4: { title: "Your pharmacy", sub: "Step 4 of 5 · where prescriptions go", headline: "Your pharmacy.", line: "Where should your prescription go?" },
  5: { title: "Your health", sub: "Step 5 of 5 · last one", headline: "Last step.", line: "Allergies, notes and an emergency contact — then you’re booked." },
};
/** Everyday picks under the reason box, matched to reasons in Bimble's list. */
const QUICK_REASONS: [string, string[]][] = [
  ["Sore throat", ["sore throat", "throat"]],
  ["Cold or flu", ["cold", "flu"]],
  ["Skin or rash", ["skin rash", "rash", "skin"]],
  ["Refill", ["prescription renewal", "refill", "renewal"]],
  ["Doctor’s note", ["sick note", "doctor's note", "note"]],
];
const CODE_LENGTH = 4;

// ---- styles (the design's navy, gold and soft grey) ------------------------------------------
const qText = "mb-2.5 block text-[15px] font-extrabold text-[#14243a] lg:mb-3 lg:text-base";
const field =
  "h-[54px] w-full rounded-[14px] border-0 bg-[#f0f4f7] px-4 text-base text-[#14243a] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a] lg:h-14 lg:px-[18px]";
const boxInput = "w-full border-0 bg-transparent p-0 text-base font-semibold text-[#14243a] outline-none placeholder:font-medium placeholder:text-[#8a9aac]";
const primary =
  "inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#14243a] px-5 text-base font-bold text-white transition-colors hover:bg-[#1f3552] disabled:opacity-60 lg:h-[58px] lg:px-10";
const gold = "bg-[#c18700] text-[17px] font-extrabold text-[#14243a] hover:bg-[#d09400]";
const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14243a]";
/** A time chip: gold with a navy ring when chosen. */
const timeChip = (on: boolean) =>
  cn(
    "h-[42px] shrink-0 rounded-full px-3 text-sm font-bold transition-colors sm:px-3.5 lg:h-[46px] lg:px-[18px] lg:text-[15px]",
    on ? "bg-[#fbecc4] text-[#14243a] shadow-[inset_0_0_0_2px_#14243a]" : "bg-[#f0f4f7] text-[#14243a] hover:bg-[#e4eaef]",
    ring,
  );
const PERIODS = [
  { name: "Morning", until: 12 * 60 },
  { name: "Afternoon", until: 17 * 60 },
  { name: "Evening", until: 24 * 60 },
];
const chip = (on: boolean) =>
  cn(
    "h-[42px] shrink-0 rounded-full px-3.5 text-sm font-bold transition-colors lg:h-[46px] lg:px-[18px] lg:text-[15px]",
    on ? "bg-[#14243a] text-white" : "bg-[#f0f4f7] text-[#14243a] hover:bg-[#e4eaef]",
    ring,
  );

const digits = (s: string) => s.replace(/\D/g, "");
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const validPostalCode = (s: string) => /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(s.trim());
/** In clinic is a Bimble "clinic" visit; video and phone are "virtual". */
const visitTypeFor = (method: string): BimbleVisitType => (method === "in-clinic" ? "clinic" : "virtual");
const errorText = (e: unknown, fallback: string) => (e instanceof BimbleError ? e.message : fallback);

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
  const [moreTimes, setMoreTimes] = useState(false);
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const top = useRef<HTMLDivElement>(null);

  // What Bimble knows about the clinic
  const [allDoctors, setAllDoctors] = useState<BimbleDoctor[]>([]);
  const [doctors, setDoctors] = useState<BimbleDoctor[]>([]);
  /** The reason (service) the doctors list was loaded for; null = none loaded yet, serviceId null = every doctor. */
  const [doctorsFor, setDoctorsFor] = useState<{ serviceId: number | null } | null>(null);
  const [visitTypes, setVisitTypes] = useState<string[]>(["virtual", "walkin"]);
  const [reasons, setReasons] = useState<BimbleReason[]>([]);
  const [slots, setSlots] = useState<BimbleSlot[] | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [reference, setReference] = useState("");
  // Phone verification: the code texted to the patient, what it is for, and the token it unlocks.
  const [otp, setOtp] = useState<{ sessionId: number; maskedPhone: string; devCode: string } | null>(null);
  const [code, setCode] = useState("");
  const [verifyFor, setVerifyFor] = useState<"identity" | "book">("identity");
  const [token, setToken] = useState<{ phone: string; value: string } | null>(null);
  const [welcome, setWelcome] = useState("");
  const [savedPharmacy, setSavedPharmacy] = useState<BimblePharmacy | null>(null);

  const set = (patch: Partial<BookingData>) => {
    setB((prev) => ({ ...prev, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  // ---- Bimble: doctors, reasons, open times ----------------------------------------------------
  useEffect(() => {
    if (!live) return;
    let off = false;
    bimble
      .doctors()
      .then((r) => {
        if (off) return;
        setAllDoctors(r.doctors);
        setDoctors(r.doctors);
        setDoctorsFor({ serviceId: null });
        setVisitTypes(r.visitTypes);
      })
      .catch((e) => !off && setApiError(errorText(e, "Could not load the clinic’s doctors.")));
    bimble
      .reasons()
      .then((r) => !off && setReasons(r))
      .catch((e) => !off && setApiError(errorText(e, "Could not load the list of reasons.")));
    return () => {
      off = true;
    };
  }, [live]);

  // As on Bimble's own booking pages, only doctors who see the chosen reason are offered.
  useEffect(() => {
    if (!live) return;
    if (b.reasonServiceId === null) {
      setDoctors(allDoctors);
      if (allDoctors.length) setDoctorsFor({ serviceId: null });
      return;
    }
    const serviceId = b.reasonServiceId;
    let off = false;
    bimble
      .doctors({ serviceId, label: b.reasonBimble || b.reason.trim() })
      .then((r) => {
        if (off) return;
        setDoctors(r.doctors);
        setDoctorsFor({ serviceId });
      })
      .catch((e) => {
        if (off) return;
        setDoctors([]);
        setDoctorsFor({ serviceId });
        setApiError(errorText(e, "Could not load the clinic’s doctors."));
      });
    return () => {
      off = true;
    };
    // The label only changes together with the service it belongs to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, b.reasonServiceId, allDoctors]);

  // The clinic decides which visit types can be booked online.
  const offeredMethods = useMemo(
    () => (live ? methods.filter((m) => visitTypes.includes(m.id === "in-clinic" ? "walkin" : "virtual")) : methods),
    [live, visitTypes],
  );
  useEffect(() => {
    if (b.method && !offeredMethods.some((m) => m.id === b.method)) set({ method: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeredMethods]);

  /** The doctors list belongs to the chosen reason (not the previous one, while the new list loads). */
  const doctorsReady = !live || (doctorsFor !== null && doctorsFor.serviceId === b.reasonServiceId);
  /** A reason is chosen (from Bimble's list when live), so the doctors who see it are known. */
  const reasonChosen = live ? b.reasonServiceId !== null : b.reason.trim() !== "";
  /** Open times are shown only once the reason and the visit type are chosen, so they don't change under the patient. */
  const readyForTimes = reasonChosen && b.method !== "";

  // Open times over the next days, for the chosen doctor (or every doctor) and visit type.
  useEffect(() => {
    if (!readyForTimes) {
      setSlots(null);
      return;
    }
    if (!live) {
      setSlots(availableDates().flatMap((date) => availableTimes(date, b.method).map((t) => ({ date, time: timeLabel(t), doctorId: 0 }))));
      return;
    }
    if (!doctorsReady) {
      setSlots(null);
      return;
    }
    const ids = b.providerId === "any" ? doctors.map((d) => d.id) : [Number(b.providerId)];
    if (!ids.length) {
      setSlots(allDoctors.length ? [] : null);
      return;
    }
    let off = false;
    setSlots(null);
    bimble
      .slots(ids, visitTypeFor(b.method))
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
  }, [live, readyForTimes, b.method, b.providerId, doctors, doctorsReady, allDoctors.length, slotsVersion]);

  /** No doctor at the clinic sees the chosen reason online. */
  const noDoctors = live && doctorsReady && !doctors.length;
  const doctorName = (id: number | null) => (doctors.find((d) => d.id === id) ?? allDoctors.find((d) => d.id === id))?.name ?? "";
  const pickSlot = (s: BimbleSlot) =>
    set({
      date: s.date,
      time: slotMinutes(s.time),
      slotTime: s.time,
      slotDoctorId: s.doctorId,
      provider: b.providerId === "any" ? doctorName(s.doctorId) || "First available" : b.provider,
    });

  // The patient picks the time. One that is no longer open (another doctor, visit type or reason) is cleared.
  useEffect(() => {
    if (!b.slotTime) return;
    const open = (slots ?? []).some((s) => s.date === b.date && s.time === b.slotTime && s.doctorId === b.slotDoctorId);
    if (!open) set({ date: "", time: null, slotTime: "", slotDoctorId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const dates = useMemo(() => [...new Set((slots ?? []).map((s) => s.date))], [slots]);
  /** The day whose times are shown: the one tapped, else the chosen time's day, else the first open day. */
  const [viewDate, setViewDate] = useState("");
  const shownDate = dates.includes(viewDate) ? viewDate : dates.includes(b.date) ? b.date : (dates[0] ?? "");
  const dayTimes = useMemo(() => (slots ?? []).filter((s) => s.date === shownDate), [slots, shownDate]);
  const soonest = slots?.[0];

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
    return list.slice(0, 50).map((r) => ({ key: `${r.serviceId}:${r.label}`, label: r.label }));
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
    // A new reason can change the doctors, so the doctor choice starts over.
    set({ reason: shown, reasonServiceId: r.serviceId, reasonBimble: r.label, providerId: "any", provider: "First available" });

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step]);

  // A message from Bimble shows at the top of the form: bring it into view.
  const apiErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (apiError) apiErrorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [apiError]);

  // ---- checks ------------------------------------------------------------------------------------
  const validate = (s: Step): Errors => {
    const e: Errors = {};
    if (s === 1) {
      if (!b.method) e.method = "Choose how you would like to meet.";
      else if (!b.slotTime || b.time === null) e.time = "Choose a time.";
      if (!b.reason.trim()) e.reason = "Tell us what the visit is for.";
      // Bimble books a reason from its own list, so the doctors and service match.
      else if (live && b.reasonServiceId === null) e.reason = "Choose the closest match from the list.";
    }
    if (s === 2) {
      if (b.hasCard) {
        const phn = phnError(b.cardNumber);
        if (phn) e.cardNumber = digits(b.cardNumber) ? phn : "Enter your 10-digit BC health card number.";
      } else if (!validEmail(b.email)) e.email = "Enter a valid email address.";
      const dob = dobError(b.dob);
      if (dob) e.dob = dob;
      if (digits(b.cellPhone).length !== 10) e.cellPhone = "Enter a 10-digit cell phone number that can receive texts.";
    }
    if (s === 3) {
      if (!b.firstName.trim()) e.firstName = "Enter your first name.";
      if (!b.lastName.trim()) e.lastName = "Enter your last name.";
      if (!b.sex) e.sex = "Choose one.";
      if (!b.addressLine.trim()) e.addressLine = "Enter your street address.";
      if (!b.city.trim()) e.city = "Enter your city.";
      if (!provinces.includes(b.province)) e.province = "Choose your province.";
      if (!b.postalCode.trim()) e.postalCode = "Enter your postal code.";
      else if (!validPostalCode(b.postalCode)) e.postalCode = "Enter a valid postal code, e.g. V2T 4V1.";
    }
    if (s === 4 && b.pharmacy.trim() && !b.delivery) e.delivery = "Choose pick up or home delivery.";
    if (s === 4 && b.pharmacy.trim() && !b.pharmacyConsent) e.pharmacyConsent = "Tick the box to send prescriptions to this pharmacy, or skip the pharmacy.";
    if (s === 5) {
      if (b.emergencyName.trim() || b.emergencyPhone.trim() || b.emergencyRelation) {
        if (!b.emergencyName.trim()) e.emergencyName = "Enter their name.";
        if (digits(b.emergencyPhone).length !== 10) e.emergencyPhone = "Enter a 10-digit phone number.";
      }
      if (!b.terms) e.terms = "Please confirm to book.";
    }
    return e;
  };

  const finish = (n: number) => setDone((d) => Math.max(d, n));

  // ---- phone verification + identity ------------------------------------------------------------
  const verifiedToken = () => (token && token.phone === b.cellPhone ? token.value : "");
  /** What Bimble last matched to the verified phone; unchanged, there is nothing to check again. */
  const identityKey = () => [b.cellPhone, b.hasCard ? digits(b.cardNumber) : b.email.trim().toLowerCase(), dobToIso(b.dob)].join("|");
  const [checkedIdentity, setCheckedIdentity] = useState("");

  const sendCode = async (purpose: "identity" | "book") => {
    const res = await bimble.startPhone(b.cellPhone);
    setOtp({ sessionId: res.intake_session_id, maskedPhone: res.masked_phone, devCode: res.dev_otp ?? "" });
    setCode("");
    setVerifyFor(purpose);
    setErrors({});
  };

  /**
   * Bimble checks the health card / email and date of birth against the verified phone. A returning
   * patient's saved details fill in the empty fields; a mismatch goes back to step 2 on the right field.
   */
  const checkIdentity = async (accessToken: string) => {
    try {
      const known = await bimble.checkIdentity(accessToken, { dob: dobToIso(b.dob), phn: b.hasCard ? digits(b.cardNumber) : "", email: b.email.trim() });
      setB((prev) => {
        const keep = (current: string, saved: string) => current.trim() || saved;
        const sex = sexOptions.find((o) => o.label.toLowerCase() === known.gender.toLowerCase())?.id ?? "";
        const pharmacy = !prev.pharmacy && known.savedPharmacy;
        return {
          ...prev,
          firstName: keep(prev.firstName, known.firstName),
          lastName: keep(prev.lastName, known.lastName),
          sex: prev.sex || sex,
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
          ...(pharmacy
            ? {
                pharmacy: pharmacy.name,
                pharmacyAddress: pharmacy.address,
                pharmacyCity: pharmacy.city,
                pharmacyPostalCode: pharmacy.postalCode,
                pharmacyPhone: pharmacy.phone,
              }
            : {}),
        };
      });
      setSavedPharmacy(known.savedPharmacy);
      setWelcome(known.existing ? `Welcome back${known.name ? `, ${known.name}` : ""}! We found your record and filled in what we have.` : "");
      setCheckedIdentity(identityKey());
      finish(2);
      setStep(3);
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
      setStep(2);
    }
  };

  /** Step 2: verify the phone (once), then have Bimble check who is booking. */
  const identify = async () => {
    setApiError("");
    // Back to look or edit, and nothing here changed: carry on without asking Bimble again.
    if (verifiedToken() && checkedIdentity === identityKey()) {
      finish(2);
      setStep(3);
      return;
    }
    setBusy(true);
    try {
      const verified = verifiedToken();
      if (verified) await checkIdentity(verified);
      else await sendCode("identity");
    } catch (e) {
      setApiError(errorText(e, "Something went wrong. Please try again or call the clinic."));
    } finally {
      setBusy(false);
    }
  };

  // ---- booking ---------------------------------------------------------------------------------
  /** Everything the doctor should see beyond the reason for visit. */
  const visitNotes = () =>
    [
      b.method !== "in-clinic" ? `Visit by: ${methodLabel(b.method)}` : "",
      b.noKnownAllergies && !b.allergies.trim() ? "No known allergies" : "",
      b.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");

  const book = async (accessToken: string) => {
    const res = await bimble.book(accessToken, {
      phn: b.hasCard ? digits(b.cardNumber) : "",
      email: b.email.trim(),
      dob: dobToIso(b.dob),
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      sex: sexOptions.find((o) => o.id === b.sex)?.label ?? b.sex,
      address: { street: b.addressLine.trim(), unit: b.unitNumber.trim(), city: b.city.trim(), province: b.province, postalCode: b.postalCode.trim().toUpperCase() },
      reason: b.reasonBimble || b.reason.trim(),
      serviceId: b.reasonServiceId,
      allergies: b.allergies,
      notes: visitNotes(),
      visitType: visitTypeFor(b.method),
      date: b.date,
      time: b.slotTime,
      doctorId: b.slotDoctorId ?? 0,
      firstAvailable: b.providerId === "any",
      pharmacy: { name: b.pharmacy, address: b.pharmacyAddress, city: b.pharmacyCity, postalCode: b.pharmacyPostalCode, phone: b.pharmacyPhone },
      delivery: b.delivery,
      pharmacyConsent: b.pharmacyConsent,
      emergencyContact: { name: b.emergencyName, phone: b.emergencyPhone, relation: b.emergencyRelation },
    });
    setB((prev) => ({ ...prev, provider: res.assigned_doctor_name || prev.provider, cardNumber: "" }));
    setReference(String(res.appointment_id));
    setToken(null);
    setOtp(null);
    finish(5);
    setStep("booked");
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
      setStep(5);
    } else if (status === 409) {
      // Someone else just took that time, or it is too close to another booking of theirs.
      setApiError(message);
      set({ date: "", time: null, slotTime: "", slotDoctorId: null });
      setSlotsVersion((v) => v + 1);
      setStep(1);
    } else {
      const fieldName = e instanceof BimbleError ? e.field : "";
      const key = fieldName === "phn" ? "cardNumber" : fieldName === "emailIfNoPhn" ? "email" : fieldName === "dateOfBirth" ? "dob" : "";
      if (key) {
        setErrors({ [key]: message });
        setStep(2);
      } else {
        setApiError(message);
        setStep(5);
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
      finish(5);
      setStep("booked");
      return;
    }
    // This phone is already verified: book directly.
    const verified = verifiedToken();
    try {
      if (verified) await book(verified);
      else await sendCode("book");
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
    setApiError("");
    setBusy(true);
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
      if (verifyFor === "identity") await checkIdentity(verified);
      else await book(verified);
    } catch (e) {
      if (verifyFor === "identity") setApiError(errorText(e, "Something went wrong. Please try again or call the clinic."));
      else handleBookingError(e, Boolean(verified));
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setApiError("");
    setBusy(true);
    try {
      await sendCode(verifyFor);
    } catch (e) {
      setApiError(errorText(e, "Could not send a new code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  // ---- navigation --------------------------------------------------------------------------------
  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) {
      // Show the first problem, wherever it is on the page.
      requestAnimationFrame(() => document.querySelector("main [role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setApiError("");
    if (step === 1) {
      finish(1);
      setStep(2);
    } else if (step === 2) {
      if (live) void identify();
      else {
        finish(2);
        setStep(3);
      }
    } else if (step === 3) {
      finish(3);
      setStep(4);
    } else if (step === 4) {
      finish(4);
      setStep(5);
    } else if (step === 5) void confirmBook();
  };
  const back = () => {
    setErrors({});
    setApiError("");
    if (typeof step === "number" && step > 1) setStep((step - 1) as Step);
  };
  /** Go to a finished step (or the next one) from the side panel or the summary pill. */
  const goTo = (n: number) => {
    if (n <= done + 1) {
      setErrors({});
      setApiError("");
      setStep(n as Step);
    }
  };
  const skipPharmacy = () => {
    set({ pharmacy: "", pharmacyAddress: "", pharmacyCity: "", pharmacyPostalCode: "", pharmacyPhone: "", pharmacyConsent: false });
    finish(4);
    setStep(5);
  };
  const choosePharmacy = (p: BimblePharmacy) => {
    set({ pharmacy: p.name, pharmacyAddress: p.address, pharmacyCity: p.city, pharmacyPostalCode: p.postalCode, pharmacyPhone: p.phone });
    // The search did its job: show just the chosen pharmacy. Typing again brings results back.
    setPharmacyQuery("");
  };

  const downloadCalendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(b)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `123-walk-in-appointment-${b.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- summaries -----------------------------------------------------------------------------------
  const when = b.date && b.slotTime ? `${dayLabel(b.date)} ${b.slotTime}` : "";
  const visitSummary = [methodShort(b.method), when, b.reason.trim()].filter(Boolean).join(" · ");
  /** "See you today at 4:00 PM" / "See you on Wed 30 at 4:00 PM". */
  const seeYou = (() => {
    if (!b.date || !b.slotTime) return "See you soon";
    const day = dayLabel(b.date);
    return `See you ${day === "Today" || day === "Tomorrow" ? day.toLowerCase() : `on ${day}`} at ${b.slotTime}`;
  })();
  const deliveryLabel = b.delivery === "delivery" ? "Home delivery" : b.delivery === "pickup" ? "Pick up" : "";
  const stepSummary = [
    visitSummary,
    live && verifiedToken() ? "Verified by text" : b.hasCard ? `Health card ••••${digits(b.cardNumber).slice(-4)}` : b.email,
    [b.firstName, b.lastName].filter(Boolean).join(" "),
    b.pharmacy ? [b.pharmacy, deliveryLabel].filter(Boolean).join(" · ") : "No pharmacy",
    "",
  ];
  const current = step === "booked" ? 6 : step;
  const clinicPhone = site.phone.replace(/^\+1\s*/, "");
  /** After booking: what the patient can expect, in order. */
  const nextSteps: ReactNode[] = [
    <>We’ve texted your confirmation to <b>{b.cellPhone}</b>.</>,
    b.method === "video" ? (
      <>We’ll text you the video link before your appointment.</>
    ) : b.method === "phone" ? (
      <>The doctor will call you at <b>{b.cellPhone}</b> at your appointment time.</>
    ) : (
      <>Come to {clinicLocation.address} a few minutes early.</>
    ),
    <>
      Need to change or cancel? Call{" "}
      <a href={site.phoneHref} className={cn("font-bold underline", ring)}>
        {clinicPhone}
      </a>
      .
    </>,
  ];
  const copy = step === "booked" ? null : COPY[step];

  /** Enter the texted code right where the phone number is (no separate screen). */
  const codePanel = otp && (
    <div>
      <span className="mb-2 block text-xs font-bold text-[#4a5a6e] lg:text-[13px]">
        Code texted to {otp.maskedPhone}
        {verifyFor === "book" ? " — enter it to book" : ""}
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
  const awaitingCode = Boolean(otp) && ((step === 2 && verifyFor === "identity") || (step === 5 && verifyFor === "book"));

  // ---- render --------------------------------------------------------------------------------------
  return (
    <div ref={top} className="min-h-dvh bg-[#14243a] text-[#14243a] lg:flex lg:bg-white">
      {/* Side panel (wide screens) */}
      <aside className="sticky top-0 hidden h-dvh w-[42%] max-w-[720px] min-w-[400px] shrink-0 flex-col gap-9 overflow-y-auto bg-[#14243a] px-11 py-10 text-white lg:flex xl:px-16 2xl:px-24">
        <div className="self-start">
          <Logo onDark size="sm" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[40px] leading-[1.08] font-extrabold tracking-[-0.03em] xl:text-[48px] 2xl:text-[56px]">{copy ? copy.headline : "You’re booked."}</h1>
          <p className="text-base leading-normal text-[#c8d3de]">{copy ? copy.line : `${seeYou}.`}</p>
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
                {isDone && (
                  <button
                    type="button"
                    onClick={() => goTo(n)}
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
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.025em] sm:text-[30px]">{copy ? copy.title : "You’re booked!"}</h1>
          {step === "booked" ? (
            <span className="text-[15px] text-[#c8d3de]">{seeYou}</span>
          ) : (
            copy?.sub && step !== 2 && <span className="text-sm text-[#c8d3de]">{copy.sub}</span>
          )}
          {typeof step === "number" && step > 1 && visitSummary && (
            <button
              type="button"
              onClick={() => goTo(1)}
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
            // Booked: the card starts level with the side panel's "You're booked." headline.
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
              <p>{apiError}</p>
              <button type="button" aria-label="Dismiss" onClick={() => setApiError("")} className={cn("grid size-6 shrink-0 place-items-center rounded-full hover:bg-black/5", ring)}>
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          {/* 1 · Your visit */}
          {step === 1 && (
            <div className="flex flex-col gap-6 lg:gap-8">
              <div>
                <label htmlFor="reason" className={qText}>
                  What’s it for?
                </label>
                {live ? (
                  <Combobox
                    id="reason"
                    value={b.reason}
                    placeholder="Type a symptom or reason"
                    options={reasonOptions}
                    loading={!reasons.length}
                    emptyText="No matching reason. Try another word."
                    invalid={!!errors.reason}
                    className={cn(field, errors.reason && "shadow-[inset_0_0_0_2px_#c92a2a]")}
                    onChange={(text) => {
                      // Typing keeps the reason only while it still matches a listed one (or a quick button) exactly.
                      const typed = text.trim().toLowerCase();
                      const exact =
                        reasons.find((r) => r.label.toLowerCase() === typed) ?? quickReasons.find((q) => q.label.toLowerCase() === typed)?.reason ?? null;
                      set({ reason: text, reasonServiceId: exact?.serviceId ?? null, reasonBimble: exact?.label ?? "" });
                    }}
                    onPick={(o) => {
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
                    className={cn(field, errors.reason && "shadow-[inset_0_0_0_2px_#c92a2a]")}
                  />
                )}
                {quickReasons.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 lg:mt-3 lg:gap-2">
                    {quickReasons.map(({ label, reason }, i) => {
                      const on = b.reason === label && (!reason || b.reasonServiceId === reason.serviceId);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => (reason ? chooseReason(reason, label) : set({ reason: label }))}
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
                  </div>
                )}
                {errors.reason && <Err>{errors.reason}</Err>}
              </div>

              <fieldset className="min-w-0">
                <legend className={qText}>How would you like to meet?</legend>
                <div className="grid grid-cols-3 gap-2 lg:gap-3">
                  {offeredMethods.map((m) => {
                    const on = b.method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ method: m.id })}
                        className={cn(
                          "flex h-[68px] w-full flex-col items-center justify-center gap-1 rounded-[18px] px-2 text-sm font-bold transition-colors lg:h-14 lg:flex-row lg:gap-2.5 lg:text-[15px]",
                          on ? "border-2 border-[#14243a] bg-[#fbecc4]" : "border-[1.5px] border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                          ring,
                        )}
                      >
                        <MethodIcon id={m.id} />
                        <span className="lg:hidden">{m.short}</span>
                        <span className="hidden lg:inline">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.method && <Err>{errors.method}</Err>}
              </fieldset>

              <div>
                <label htmlFor="doctor" className={qText}>
                  Who would you like to see?
                </label>
                <Dropdown
                  id="doctor"
                  value={b.providerId}
                  disabled={noDoctors || !reasonChosen || !doctorsReady}
                  options={[
                    {
                      value: "any",
                      label: !reasonChosen ? "Choose what it’s for first" : !doctorsReady ? "Finding doctors…" : noDoctors ? "No doctor for this reason" : "First available doctor",
                    },
                    ...(reasonChosen && doctorsReady ? doctors.map((d) => ({ value: String(d.id), label: d.name })) : []),
                  ]}
                  onChange={(v) => set({ providerId: v, provider: v === "any" ? "First available" : doctorName(Number(v)) })}
                  className={cn(field, "font-semibold disabled:text-[#6b7a8c]", ring)}
                />
              </div>

              <fieldset className="min-w-0">
                <legend className={qText}>When?</legend>
                {!readyForTimes ? (
                  <p className="rounded-2xl bg-[#f0f4f7] px-4 py-3 text-sm text-[#3d4d61]">
                    {!reasonChosen && !b.method
                      ? "Choose what it’s for and how you’d like to meet to see open times."
                      : !reasonChosen
                        ? "Choose what it’s for to see open times."
                        : "Choose how you’d like to meet to see open times."}
                  </p>
                ) : slots === null ? (
                  <p className="text-sm text-[#4a5a6e]">Finding open times…</p>
                ) : !dates.length ? (
                  <p className="rounded-2xl bg-[#f0f4f7] px-4 py-3 text-sm text-[#3d4d61]">
                    {noDoctors
                      ? "No doctor here sees this reason online. Choose another reason, or call the clinic."
                      : `No open times${b.providerId !== "any" ? " with this doctor" : ""}. Try another ${b.providerId !== "any" ? "doctor or " : ""}way to meet, or call the clinic.`}
                  </p>
                ) : (
                  <>
                    <div className="-mx-5 mb-2.5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:mb-3 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
                      {dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={shownDate === d}
                          onClick={(e) => {
                            // Phones scroll the row of days: slide the chosen day to the middle.
                            const chipEl = e.currentTarget;
                            const row = chipEl.parentElement;
                            setTimeout(() => {
                              if (!row || row.scrollWidth <= row.clientWidth) return;
                              const c = chipEl.getBoundingClientRect();
                              const r = row.getBoundingClientRect();
                              row.scrollTo({ left: row.scrollLeft + c.left - r.left - (r.width - c.width) / 2, behavior: "smooth" });
                            }, 0);
                            setMoreTimes(false);
                            setViewDate(d);
                          }}
                          className={chip(shownDate === d)}
                        >
                          {dayLabel(d)}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const isOn = (s: BimbleSlot) => s.date === b.date && s.time === b.slotTime && s.doctorId === b.slotDoctorId;
                      const timeButton = (s: BimbleSlot, extra?: string | false) => {
                        const isSoonest = soonest && s.date === soonest.date && s.time === soonest.time;
                        return (
                          <button key={`${s.time}-${s.doctorId}`} type="button" aria-pressed={isOn(s)} onClick={() => pickSlot(s)} className={cn(timeChip(isOn(s)), extra)}>
                            {s.time}
                            {isSoonest && <span className="hidden lg:inline"> · soonest</span>}
                          </button>
                        );
                      };
                      const moreButton = dayTimes.length > 3 && (
                        <button
                          type="button"
                          aria-expanded={moreTimes}
                          onClick={() => setMoreTimes((v) => !v)}
                          className={cn("h-[42px] shrink-0 rounded-full px-1.5 text-sm font-bold underline hover:bg-[#f0f4f7] sm:px-2 lg:h-[46px] lg:px-3 lg:text-[15px]", ring)}
                        >
                          {moreTimes ? (
                            "Fewer times"
                          ) : (
                            <>
                              More<span className="max-sm:hidden"> times</span>
                            </>
                          )}
                        </button>
                      );
                      if (!moreTimes)
                        return (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {dayTimes.slice(0, 4).map((s, i) => timeButton(s, i === 3 && "max-sm:hidden"))}
                            {moreButton}
                          </div>
                        );
                      // Every time that day, by part of day, in a box that scrolls when the day is long.
                      let from = 0;
                      const groups = PERIODS.map((p) => {
                        const items = dayTimes.filter((s) => slotMinutes(s.time) >= from && slotMinutes(s.time) < p.until);
                        from = p.until;
                        return { name: p.name, items };
                      }).filter((g) => g.items.length);
                      return (
                        <>
                          <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto rounded-2xl border-[1.5px] border-[#e1e8ee] p-3">
                            {groups.map((g) => (
                              <div key={g.name}>
                                <span className="mb-1.5 block text-xs font-bold tracking-wide text-[#4a5a6e] uppercase">{g.name}</span>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">{g.items.map((s) => timeButton(s))}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1.5">{moreButton}</div>
                        </>
                      );
                    })()}
                  </>
                )}
                {errors.time && <Err>{errors.time}</Err>}
              </fieldset>

            </div>
          )}

          {/* 2 · Find your record */}
          {step === 2 && (
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
              <Box id="dob" label="Date of birth" error={errors.dob}>
                <input
                  id="dob"
                  inputMode="numeric"
                  autoComplete="bday"
                  placeholder="MM / DD / YYYY"
                  value={b.dob}
                  onChange={(e) => {
                    const dob = formatDob(e.target.value);
                    set({ dob });
                    const problem = dob.replace(/\D/g, "").length === 8 ? dobError(dob) : "";
                    if (problem) setErrors((er) => ({ ...er, dob: problem }));
                  }}
                  aria-invalid={!!errors.dob}
                  className={boxInput}
                />
              </Box>
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
                {!(otp && verifyFor === "identity") && (
                  <p className="mx-1 mt-1.5 text-xs text-[#4a5a6e] lg:mt-2 lg:text-[13px]">
                    {live ? "We’ll text a code to confirm it’s you. " : ""}Been here before? We’ll fill in the rest.
                  </p>
                )}
              </div>
              {otp && verifyFor === "identity" && codePanel}
            </div>
          )}

          {/* 3 · Your details */}
          {step === 3 && (
            <div className="flex flex-col gap-3 lg:gap-5">
              {welcome && <p className="rounded-2xl bg-[#e8f5ee] px-4 py-3 text-sm font-semibold text-[#1f5c3a]">{welcome}</p>}
              <span className="hidden text-base font-extrabold text-[#14243a] lg:block">About you</span>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
                <Box id="firstName" label="First name" error={errors.firstName}>
                  <input id="firstName" autoComplete="given-name" value={b.firstName} onChange={(e) => set({ firstName: e.target.value })} aria-invalid={!!errors.firstName} className={boxInput} />
                </Box>
                <Box id="lastName" label="Last name" error={errors.lastName}>
                  <input id="lastName" autoComplete="family-name" value={b.lastName} onChange={(e) => set({ lastName: e.target.value })} aria-invalid={!!errors.lastName} className={boxInput} />
                </Box>
                <Box id="sex" label="Sex" error={errors.sex} className="col-span-2 lg:col-span-1">
                  <Dropdown
                    id="sex"
                    anchored
                    value={b.sex}
                    options={sexOptions.map((o) => ({ value: o.id, label: o.label }))}
                    onChange={(v) => set({ sex: v })}
                    invalid={!!errors.sex}
                    className="text-base font-semibold text-[#14243a] outline-none"
                  />
                </Box>
              </div>
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
                    onChange={(text) => set({ addressLine: text })}
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
                  <input id="city" autoComplete="address-level2" placeholder="Abbotsford" value={b.city} onChange={(e) => set({ city: e.target.value })} aria-invalid={!!errors.city} className={boxInput} />
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

          {/* 4 · Pharmacy */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <span className={qText}>Pick up or delivery?</span>
                <div className="mb-6 lg:mb-8">
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ["pickup", "Pick up", "at the pharmacy"],
                      ["delivery", "Home delivery", "to your address"],
                    ] as const
                  ).map(([v, title, sub]) => {
                    const on = b.delivery === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ delivery: v })}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-left transition-colors",
                          on ? "border-2 border-[#14243a] bg-[#fbecc4]" : "border-[1.5px] border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                          ring,
                        )}
                      >
                        <span className={cn("size-[22px] shrink-0 rounded-full bg-white", on ? "border-[7px] border-[#14243a]" : "border-2 border-[#9fb0c2]")} />
                        <span className="flex flex-col gap-px">
                          <b className="text-sm">{title}</b>
                          <small className="text-xs text-[#4a5a6e]">{sub}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.delivery && <Err>{errors.delivery}</Err>}
                </div>
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
                    className={cn(field, "pl-11 lg:pl-12")}
                  />
                </div>
              </div>
              {live && (
                <div className="flex flex-col gap-2">
                  {(() => {
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
                              onClick={() => (on ? set({ pharmacy: "", pharmacyAddress: "", pharmacyCity: "", pharmacyPostalCode: "", pharmacyPhone: "", pharmacyConsent: false }) : choosePharmacy(p))}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left lg:px-4 lg:py-3.5",
                                on ? "border-2 border-[#14243a] bg-[#f5f9fc]" : "border-[1.5px] border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
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
                              set({ pharmacy: typed, pharmacyAddress: "", pharmacyCity: "", pharmacyPostalCode: "", pharmacyPhone: "" });
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
                </div>
              )}
              <button type="button" onClick={skipPharmacy} className={cn("self-start text-[13px] font-semibold text-[#4a5a6e] underline lg:text-sm", ring)}>
                Skip — I don’t need a pharmacy
              </button>
            </div>
          )}

          {/* 5 · Your health */}
          {step === 5 && (
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
                    onChange={(e) => set({ emergencyName: e.target.value })}
                    aria-invalid={!!errors.emergencyName}
                    className={cn(field, errors.emergencyName && "shadow-[inset_0_0_0_2px_#c92a2a]")}
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
                      className={cn(field, errors.emergencyPhone && "shadow-[inset_0_0_0_2px_#c92a2a]")}
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
                  maxLength={500}
                  placeholder="Anything else the doctor should know?"
                  value={b.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  className="h-20 w-full resize-none rounded-[14px] border-0 bg-[#f0f4f7] px-4 py-3 text-[15px] text-[#14243a] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a] lg:h-24"
                />
              </div>
            </div>
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
                    ["When", b.date ? `${dayLabel(b.date)} · ${b.slotTime}` : ""],
                    ["Doctor", b.provider],
                    ["Reason", b.reason],
                    ["Pharmacy", b.pharmacy ? [b.pharmacy, deliveryLabel].filter(Boolean).join(" · ") : "None"],
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
            {step === 4 && b.pharmacy && (
              <label className="mb-3 flex items-start gap-2.5 text-xs leading-[1.45] text-[#3d4d61] lg:items-center lg:text-[13px]">
                <input
                  type="checkbox"
                  checked={b.pharmacyConsent}
                  onChange={(e) => set({ pharmacyConsent: e.target.checked })}
                  className="m-0 size-5 shrink-0 accent-[#14243a]"
                />
                <span>Send any prescription from this visit to this pharmacy.</span>
              </label>
            )}
            {step === 4 && errors.pharmacyConsent && <Err>{errors.pharmacyConsent}</Err>}
            {step === 5 && otp && verifyFor === "book" && <div className="mb-4">{codePanel}</div>}
            {step === 5 && (
              <>
                <label className="mb-3 flex items-start gap-2.5 text-xs leading-[1.45] text-[#3d4d61] lg:items-center lg:text-[13px]">
                  <input type="checkbox" checked={b.terms} onChange={(e) => set({ terms: e.target.checked })} className="m-0 size-5 shrink-0 accent-[#14243a]" />
                  <span>I’ll be in BC for the visit and accept {clinicLocation.clinic}’s terms &amp; privacy policy.</span>
                </label>
                {errors.terms && <Err>{errors.terms}</Err>}
              </>
            )}
            {step === "booked" ? (
              <div className="flex flex-col gap-2.5 lg:flex-row lg:justify-between">
                <button type="button" onClick={downloadCalendar} className={cn("inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f0f4f7] px-6 text-base font-bold hover:bg-[#e4eaef] lg:h-[58px]", ring)}>
                  <CalendarIcon className="size-[18px]" /> Add to calendar
                </button>
                <Link href="/" className={cn(primary, ring)}>
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
                {step === 1 && visitSummary && (
                  // Everything chosen so far, next to Next: visit type, day and time, reason.
                  <span className="hidden min-w-0 flex-1 text-right text-sm leading-snug text-[#4a5a6e] lg:block">{visitSummary}</span>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={awaitingCode ? () => void verifyCode() : next}
                  className={cn(primary, "w-full lg:ml-auto lg:w-auto", step === 1 && "max-lg:justify-between", step === 5 && gold, ring)}
                >
                  {step === 1 ? (
                    <>
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[#c8d3de] lg:hidden">{visitSummary}</span>
                      <span>Next →</span>
                    </>
                  ) : awaitingCode ? (
                    busy ? "Checking…" : step === 5 ? "Verify and book" : "Verify →"
                  ) : step === 2 ? (
                    busy ? (live ? (verifiedToken() ? "Checking…" : "Sending code…") : "Next") : live ? (verifiedToken() ? "Next →" : "Text me a code") : "Next →"
                  ) : step === 4 ? (
                    "Next · Your health →"
                  ) : step === 5 ? (
                    busy ? "Booking…" : `Book ${b.slotTime || "appointment"}`
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
          error && "shadow-[inset_0_0_0_2px_#c92a2a]",
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
            invalid && "shadow-[inset_0_0_0_2px_#c92a2a]",
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

function MethodIcon({ id }: { id: string }) {
  const common = { viewBox: "0 0 24 24", className: "size-6 shrink-0 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round] lg:size-[26px]", "aria-hidden": true };
  if (id === "video")
    return (
      <svg {...common}>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M16 10l6-3v10l-6-3z" />
      </svg>
    );
  if (id === "phone")
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M10 21v-5h4v5" />
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
