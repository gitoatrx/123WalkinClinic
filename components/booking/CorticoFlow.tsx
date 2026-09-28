"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  availableDates,
  availableTimes,
  calendarFile,
  clinicLocation,
  demoPharmacies,
  emptyBooking,
  formatDate,
  formatTime,
  formNoteOptions,
  locationLine,
  methodLabel,
  methods,
  months,
  providers,
  serviceOptions,
  sexOptions,
  type BookingData,
} from "@/lib/booking";
import { emr, EmrError, slotMinutes, type EmrProvider, type EmrSlot } from "@/lib/emr";
import { site } from "@/lib/site";
import { cn } from "@/lib/ui";

/**
 * Demo of the clinic's Cortico booking flow (123walkin.cortico.ca), step for
 * step: Please Note → Select a Service → Patient Identification → Patient
 * Consent → Patient Information → Provider, Method and Time → Additional
 * Information → Confirm → Booked. Field labels and error messages follow Cortico.
 * Live mode (EMR API connected): doctors, dates and times come from Juno and
 * "Book Appointment" writes the appointment into Juno. Otherwise it is a demo
 * and nothing is submitted; see the notice at the top of the page.
 */

const STEPS = ["Select a Service", "Patient Identification", "Patient Consent", "Patient Information", "Provider, Method and Time", "Additional Information"];
type Stage = 0 | 1 | 2 | 3 | 4 | 5 | "confirm" | "booked";
type Errors = Record<string, string>;

const input =
  "block w-full rounded-[4px] border border-[#cfd4dc] bg-white px-3 py-2.5 text-base text-[#1b2437] placeholder:text-[#9aa3b2] focus:border-[#3b5bdb] focus:ring-2 focus:ring-[#3b5bdb]/20 focus:outline-none aria-invalid:border-[#e8590c] aria-invalid:bg-[#fff8f3]";
const label = "mb-1.5 block text-[15px] font-medium text-[#1b2437]";
const btnOutline =
  "inline-flex items-center gap-2 rounded-[4px] border border-[#e3e7ee] bg-white px-4 py-2.5 text-[15px] font-medium text-[#3b5bdb] transition-colors hover:border-[#3b5bdb] hover:bg-[#f3f6ff] disabled:opacity-50";
const btnSolid =
  "inline-flex items-center gap-2 rounded-[4px] bg-[#3b5bdb] px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-[#3149b8] disabled:opacity-60";

const digits = (s: string) => s.replace(/\D/g, "");
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function CorticoFlow() {
  const [agreed, setAgreed] = useState(false);
  const [stage, setStage] = useState<Stage>(1);
  const [showServices, setShowServices] = useState(false);
  const [b, setB] = useState<BookingData>(emptyBooking);
  const [errors, setErrors] = useState<Errors>({});
  const [alertOpen, setAlertOpen] = useState(true);
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
  const [feedback, setFeedback] = useState<"happy" | "unhappy" | null>(null);
  const [booking, setBooking] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // Live (Juno) mode
  const [live, setLive] = useState<boolean | null>(null);
  const [emrProviders, setEmrProviders] = useState<EmrProvider[]>([]);
  const [liveDates, setLiveDates] = useState<string[] | null>(null);
  const [liveSlots, setLiveSlots] = useState<EmrSlot[] | null>(null);
  const [loading, setLoading] = useState("");
  const [apiError, setApiError] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    let off = false;
    emr.isLive().then(async (on) => {
      if (off) return;
      setLive(on);
      if (!on) return;
      try {
        const list = await emr.providers();
        if (!off) setEmrProviders(list);
      } catch (e) {
        if (!off) setApiError(e instanceof EmrError ? e.message : "Could not load doctors.");
      }
    });
    return () => {
      off = true;
    };
  }, []);

  // Days with open slots for the chosen doctor
  useEffect(() => {
    if (!live) return;
    let off = false;
    setLiveDates(null);
    setLoading("dates");
    emr
      .dates(b.providerId)
      .then((d) => !off && setLiveDates(d))
      .catch((e) => !off && setApiError(e instanceof EmrError ? e.message : "Could not load dates."))
      .finally(() => !off && setLoading(""));
    return () => {
      off = true;
    };
  }, [live, b.providerId]);

  // Open times on the chosen day
  const loadSlots = (providerId: string, date: string) => {
    setLiveSlots(null);
    if (!date) return () => {};
    let off = false;
    setLoading("times");
    emr
      .times(providerId, date)
      .then((t) => !off && setLiveSlots(t))
      .catch((e) => !off && setApiError(e instanceof EmrError ? e.message : "Could not load times."))
      .finally(() => !off && setLoading(""));
    return () => {
      off = true;
    };
  };
  useEffect(() => {
    if (live) return loadSlots(b.providerId, b.date);
  }, [live, b.providerId, b.date]);

  const dates = useMemo(() => (live ? (liveDates ?? []) : availableDates()), [live, liveDates]);
  const times = useMemo(() => (b.date && b.method ? availableTimes(b.date, b.method) : []), [b.date, b.method]);

  // "Available in 3 days" — live mode works it out from the first open day.
  const availability = useMemo(() => {
    if (live === false) return `in ${clinicLocation.daysUntilAvailable} days`;
    if (!liveDates?.length) return "";
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: clinicLocation.timeZone }).format(new Date());
    const days = Math.round((Date.parse(liveDates[0]) - Date.parse(today)) / 86_400_000);
    return days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  }, [live, liveDates]);

  const providerName = (id: string) => emrProviders.find((p) => p.id === id)?.name ?? "";

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage, showServices]);

  const set = (patch: Partial<BookingData>) => {
    setB((prev) => ({ ...prev, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      if ("cellPhone" in patch || "homePhone" in patch) delete next.phone;
      return next;
    });
  };

  const validate = (s: Stage): Errors => {
    const e: Errors = {};
    if (s === 1) {
      if (b.hasCard) {
        if (!b.cardNumber.trim()) e.cardNumber = "Please enter a Health Card Number.";
        else if (digits(b.cardNumber).length !== 10) e.cardNumber = "Health Card Number must be 10 digits.";
      } else if (!validEmail(b.email)) e.email = "Please enter a valid email address.";
      if (!/^\d{4}$/.test(b.dobYear)) e.dobYear = "Year must be in YYYY format and numbers only.";
      const day = Number(b.dobDay);
      if (!/^\d{1,2}$/.test(b.dobDay) || day < 1 || day > 31) e.dobDay = "Day must be in DD or D format and numbers only.";
    }
    if (s === 2 && !b.consent) e.consent = "Please accept to continue.";
    if (s === 3) {
      if (!b.firstName.trim()) e.firstName = "Please enter your first name.";
      if (!b.lastName.trim()) e.lastName = "Please enter your last name.";
      if (!validEmail(b.email)) e.email = "Please enter a valid email address.";
      if (digits(b.cellPhone).length < 10 && digits(b.homePhone).length < 10) e.phone = "Please provide at least one of cell phone or home phone number.";
      if (!b.reason.trim()) e.reason = "Please enter a reason for your visit.";
      if (!b.sex) e.sex = "Please select your sex.";
    }
    if (s === 4) {
      if (!b.method) e.method = "Please select how you would like to see your doctor.";
      else if (!b.date) e.date = "Please choose a date.";
      else if (live ? !liveSlots?.some((t) => t.start === b.slotStart) : b.time === null || !times.includes(b.time)) e.time = "Please choose a time.";
    }
    return e;
  };

  const goNext = () => {
    const e = validate(stage);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (stage === 5) setStage("confirm");
    else if (typeof stage === "number") setStage((stage + 1) as Stage);
  };

  const goBack = () => {
    setErrors({});
    if (stage === "confirm") setStage(5);
    else if (typeof stage === "number" && stage > 1) setStage((stage - 1) as Stage);
    else setShowServices(true);
  };

  const confirm = async () => {
    setApiError("");
    setBooking(true);
    if (!live) {
      await new Promise((r) => setTimeout(r, 700)); // demo: nothing is sent
      setBooking(false);
      setStage("booked");
      return;
    }
    try {
      const res = await emr.book({
        phn: b.hasCard ? digits(b.cardNumber) : "",
        dob: `${b.dobYear}-${String(b.dobMonth + 1).padStart(2, "0")}-${b.dobDay.padStart(2, "0")}`,
        firstName: b.firstName.trim(),
        lastName: b.lastName.trim(),
        email: b.email.trim(),
        cellPhone: b.cellPhone.trim(),
        homePhone: b.homePhone.trim(),
        sex: b.sex,
        reason: b.reason.trim(),
        provider: b.slotProvider,
        start: b.slotStart,
        method: methodLabel(b.method),
        formNote: b.formNote,
        pharmacy: b.pharmacy,
        delivery: b.delivery,
        notes: b.notes.trim(),
      });
      setB((prev) => ({ ...prev, provider: res.provider || prev.provider, cardNumber: "" }));
      setReference(res.appointmentId);
      setStage("booked");
    } catch (e) {
      const err = e instanceof EmrError ? e : new EmrError("Something went wrong. Please try again or call the clinic.");
      setApiError(err.message);
      if (err.code === "slot_taken") {
        setB((prev) => ({ ...prev, time: null, slotStart: "", slotProvider: "" }));
        loadSlots(b.providerId, b.date);
        setStage(4);
      }
    } finally {
      setBooking(false);
    }
  };

  const downloadCalendar = () => {
    const url = URL.createObjectURL(new Blob([calendarFile(b)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `123-walk-in-appointment-${b.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const current = stage === "confirm" || stage === "booked" ? 6 : showServices ? 0 : stage;
  const pharmacies = demoPharmacies.filter((p) => p.toLowerCase().includes(pharmacyQuery.toLowerCase()));

  return (
    <div className="bg-[#f5f6f8] pb-16" ref={top}>
      {/* Demo notice — only when the EMR API is not connected */}
      {live === false && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          <strong>Preview only:</strong> this booking form is a demo and no appointment will be made.{" "}
          <a href={site.corticoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Book for real on Cortico
          </a>
          .
        </div>
      )}

      <div className="mx-auto w-full max-w-[870px] px-[15px] pt-5 sm:pt-8">
        <div className="bg-white shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
          {/* Location header */}
          <div className="border-b border-[#eef0f4] px-6 py-6 sm:px-[70px] sm:py-7">
            <h1 className="text-[1.3rem] font-semibold text-[#1b2437]">{clinicLocation.name}</h1>
            <p className="mt-1 text-[15px] text-[#4a5468]">{clinicLocation.address}</p>
            <button type="button" onClick={() => setShowServices(true)} className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-[#3b5bdb] hover:underline">
              <span aria-hidden="true">←</span> Change Location
            </button>
          </div>

          <div className="grid md:grid-cols-[195px_1fr]">
            {/* Step list */}
            <nav aria-label="Booking steps" className="hidden border-r border-[#eef0f4] px-6 py-16 md:block">
              <ol>
                {STEPS.map((name, i) => {
                  const done = i < current;
                  const active = i === current;
                  return (
                    <li key={name} className="relative pb-7 pl-8 last:pb-0">
                      {i < STEPS.length - 1 && (
                        <span aria-hidden="true" className={cn("absolute top-5 left-[9px] h-[calc(100%-12px)] w-[2px]", done ? "bg-[#12b886]" : "bg-[#1b2437]")} />
                      )}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-0.5 left-0 grid size-5 place-items-center rounded-full border-2 bg-white text-[10px] font-semibold",
                          done || active ? "border-[#12b886] text-[#12b886]" : "border-[#1b2437] text-[#1b2437]",
                        )}
                      >
                        {done ? "✓" : i}
                      </span>
                      <span className={cn("block text-[14px] leading-tight", active ? "font-semibold text-[#1b2437]" : "text-[#1b2437]")}>
                        {name}
                        {active && <span className="sr-only"> (current step)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Step content */}
            <div className="px-6 py-7 sm:px-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[1.3rem] font-semibold text-[#1b2437]">Book a Walk-In appointment</h2>
                  {stage !== "booked" && availability && (
                    <span className="mt-3 inline-block rounded-[4px] bg-[#2f9e44] px-2 py-0.5 text-sm text-white">Available {availability}</span>
                  )}
                </div>
                <Link href="/" className="rounded-[4px] border border-[#eef0f4] px-4 py-2 text-[15px] text-[#c92a2a] hover:bg-[#fff5f5]">
                  Exit
                </Link>
              </div>
              <p className="mt-2 text-sm text-[#4a5468] md:hidden">
                {typeof stage === "number" ? `Step ${stage} of 5 · ${STEPS[stage]}` : stage === "confirm" ? "Confirm appointment" : "Booked"}
              </p>
              <hr className="my-5 border-[#eef0f4]" />

              {apiError && (
                <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-[4px] bg-[#fff4e6] px-3 py-2.5 text-[15px] text-[#b3420c]">
                  <p>{apiError}</p>
                  <button type="button" aria-label="Dismiss" onClick={() => setApiError("")} className="text-lg leading-none">
                    ×
                  </button>
                </div>
              )}

              {/* Select a Service */}
              {showServices && (
                <div>
                  <p className="mb-4 text-[15px] text-[#4a5468]">Choose the service you would like to book.</p>
                  <ul className="space-y-3">
                    {serviceOptions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            set({ serviceId: s.id });
                            setShowServices(false);
                            setStage(1);
                          }}
                          className={cn(
                            "w-full rounded-[4px] border px-4 py-3 text-left transition-colors hover:border-[#3b5bdb]",
                            b.serviceId === s.id ? "border-[#3b5bdb] bg-[#f3f6ff]" : "border-[#e3e7ee]",
                          )}
                        >
                          <span className="block font-medium text-[#1b2437]">{s.label}</span>
                          <span className="block text-sm text-[#4a5468]">{s.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!showServices && stage === 1 && (
                <div className="space-y-5">
                  {alertOpen && (
                    <div className="flex items-start justify-between gap-3 rounded-[4px] bg-[#e7f0ff] px-3 py-2.5 text-[15px] text-[#1c3faa]">
                      <p>If you are experiencing a medical emergency, please do not book using this site and call 9-1-1 instead.</p>
                      <button type="button" aria-label="Dismiss" onClick={() => setAlertOpen(false)} className="text-lg leading-none">
                        ×
                      </button>
                    </div>
                  )}
                  {availability && <p className="border-l-4 border-[#1b2437] pl-3 text-[15px] text-[#1b2437]">Earliest availability {availability}</p>}
                  <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Health card</legend>
                    {[
                      { v: true, text: "I have a health card", sub: "" },
                      { v: false, text: "No health card", sub: " (Private insurance/pay)" },
                    ].map((o) => (
                      <label key={String(o.v)} className={cn("flex cursor-pointer items-center gap-2 rounded-[4px] border px-3 py-2.5 text-[15px]", b.hasCard === o.v ? "border-[#3b5bdb] bg-[#f3f6ff]" : "border-[#e3e7ee]")}>
                        <input type="radio" name="hasCard" checked={b.hasCard === o.v} onChange={() => set({ hasCard: o.v })} className="accent-[#3b5bdb]" />
                        {o.text}
                        {o.sub && <span className="text-xs text-[#4a5468]">{o.sub}</span>}
                      </label>
                    ))}
                  </fieldset>

                  {b.hasCard ? (
                    <Field id="cardNumber" label="Health Card Number*" error={errors.cardNumber}>
                      <input
                        id="cardNumber"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="e.g. 9234567890"
                        value={b.cardNumber}
                        onChange={(e) => set({ cardNumber: e.target.value })}
                        aria-invalid={!!errors.cardNumber}
                        className={input}
                      />
                      <p className="mt-1.5 text-sm text-[#3b5bdb]">Your health card number is only used to find your record at the clinic.</p>
                    </Field>
                  ) : (
                    <Field id="email" label="Email Address*" error={errors.email}>
                      <input id="email" type="email" autoComplete="email" placeholder="e.g. smith@example.org" value={b.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} className={input} />
                    </Field>
                  )}

                  <div>
                    <span className={label}>Date of Birth*</span>
                    <div className="grid grid-cols-3 gap-3">
                      <input aria-label="Birth year" inputMode="numeric" maxLength={4} placeholder="YYYY" value={b.dobYear} onChange={(e) => set({ dobYear: e.target.value })} aria-invalid={!!errors.dobYear} className={input} />
                      <select aria-label="Birth month" value={b.dobMonth} onChange={(e) => set({ dobMonth: Number(e.target.value) })} className={input}>
                        {months.map((m, i) => (
                          <option key={m} value={i}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input aria-label="Birth day" inputMode="numeric" maxLength={2} placeholder="DD" value={b.dobDay} onChange={(e) => set({ dobDay: e.target.value })} aria-invalid={!!errors.dobDay} className={input} />
                    </div>
                    {errors.dobYear && <Err>{errors.dobYear}</Err>}
                    {errors.dobDay && <Err>{errors.dobDay}</Err>}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={b.staySignedIn} onChange={(e) => set({ staySignedIn: e.target.checked })} className="mt-1 size-5 accent-[#3b5bdb]" />
                    <span className="text-[15px] text-[#1b2437]">
                      Stay signed in for 30 days
                      <span className="block text-xs text-[#4a5468]">Not for shared devices.</span>
                    </span>
                  </label>
                </div>
              )}

              {!showServices && stage === 2 && (
                <div className="space-y-4 text-[15px] leading-relaxed text-[#1b2437]">
                  <p>Before booking, please review and accept the following:</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-[#4a5468]">
                    <li>The booking service’s terms of service and privacy policy.</li>
                    <li>{clinicLocation.clinic}’s consent to communicate and provide care using digital media (phone, video, email and text).</li>
                    <li>You must be located in British Columbia at the time of your appointment.</li>
                  </ul>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[4px] border border-[#e3e7ee] p-3">
                    <input type="checkbox" checked={b.consent} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-1 size-5 accent-[#3b5bdb]" />
                    <span>I accept the terms of service and {clinicLocation.clinic}’s agreements.</span>
                  </label>
                  {errors.consent && <Err>{errors.consent}</Err>}
                </div>
              )}

              {!showServices && stage === 3 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="firstName" label="First Name*" error={errors.firstName}>
                    <input id="firstName" autoComplete="given-name" value={b.firstName} onChange={(e) => set({ firstName: e.target.value })} aria-invalid={!!errors.firstName} className={input} />
                  </Field>
                  <Field id="lastName" label="Last Name*" error={errors.lastName}>
                    <input id="lastName" autoComplete="family-name" value={b.lastName} onChange={(e) => set({ lastName: e.target.value })} aria-invalid={!!errors.lastName} className={input} />
                  </Field>
                  <Field id="sex" label="Sex*" error={errors.sex}>
                    <select id="sex" value={b.sex} onChange={(e) => set({ sex: e.target.value })} aria-invalid={!!errors.sex} className={input}>
                      <option value="">Select</option>
                      {sexOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="hidden sm:block" />
                  <div className="sm:col-span-2">
                    <Field id="reason" label="Reason for visit / Symptom*" error={errors.reason}>
                      <input
                        id="reason"
                        maxLength={50}
                        placeholder="e.g. stomach pain, doctor’s note, etc"
                        value={b.reason}
                        onChange={(e) => set({ reason: e.target.value })}
                        aria-invalid={!!errors.reason}
                        className={input}
                      />
                      <p className="mt-1 text-xs text-[#4a5468]">{b.reason.length}/50</p>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="formNote" label="Do you need a form or note (fee may apply)?">
                      <select id="formNote" value={b.formNote} onChange={(e) => set({ formNote: e.target.value })} className={input}>
                        {formNoteOptions.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="email3" label="Email Address*" error={errors.email}>
                      <input id="email3" type="email" autoComplete="email" value={b.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} className={input} />
                    </Field>
                  </div>
                  <Field id="cellPhone" label="Cell Phone">
                    <input id="cellPhone" type="tel" autoComplete="tel" value={b.cellPhone} onChange={(e) => set({ cellPhone: e.target.value })} aria-invalid={!!errors.phone} className={input} />
                  </Field>
                  <Field id="homePhone" label="Home Phone">
                    <input id="homePhone" type="tel" value={b.homePhone} onChange={(e) => set({ homePhone: e.target.value })} aria-invalid={!!errors.phone} className={input} />
                  </Field>
                  <p className={cn("text-xs sm:col-span-2", errors.phone ? "text-[#e8590c]" : "text-[#4a5468]")}>
                    {errors.phone ?? "Please provide at least one of cell phone or home phone number."}
                  </p>
                </div>
              )}

              {!showServices && stage === 4 && (
                <div className="space-y-6">
                  <Field id="provider" label="Provider">
                    {live ? (
                      <select
                        id="provider"
                        value={b.providerId}
                        onChange={(e) =>
                          set({
                            providerId: e.target.value,
                            provider: e.target.value === "any" ? providers[0] : providerName(e.target.value),
                            date: "",
                            time: null,
                            slotStart: "",
                            slotProvider: "",
                          })
                        }
                        className={input}
                      >
                        <option value="any">{providers[0]}</option>
                        {emrProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select id="provider" value={b.provider} onChange={(e) => set({ provider: e.target.value })} className={input}>
                        {providers.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <fieldset>
                    <legend className={label}>Please select how you would like to see your doctor.</legend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {methods.map((m) => (
                        <label key={m.id} className={cn("cursor-pointer rounded-[4px] border px-3 py-2.5", b.method === m.id ? "border-[#3b5bdb] bg-[#f3f6ff]" : "border-[#e3e7ee]")}>
                          <span className="flex items-center gap-2 text-[15px] text-[#1b2437]">
                            <input type="radio" name="method" checked={b.method === m.id} onChange={() => set({ method: m.id, time: null })} className="accent-[#3b5bdb]" />
                            {m.label}
                          </span>
                          {availability && <span className="mt-1 block text-xs text-[#4a5468]">Available {availability}</span>}
                        </label>
                      ))}
                    </div>
                    {errors.method && <Err>{errors.method}</Err>}
                  </fieldset>
                  {b.method && (
                    <div>
                      <p className="mb-3 text-[15px] font-medium text-[#1b2437]">Then choose from the available dates and times:</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="date" label="Available Dates:" error={errors.date}>
                          <select
                            id="date"
                            value={b.date}
                            onChange={(e) => set({ date: e.target.value, time: null, slotStart: "", slotProvider: "" })}
                            aria-invalid={!!errors.date}
                            className={input}
                          >
                            <option value="">{loading === "dates" ? "Loading dates…" : live && !dates.length ? "No open dates" : "Select a date"}</option>
                            {dates.map((d) => (
                              <option key={d} value={d}>
                                {formatDate(d)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field id="time" label="Available Times:" error={errors.time}>
                          {live ? (
                            <select
                              id="time"
                              value={b.slotStart}
                              disabled={!b.date || loading === "times"}
                              onChange={(e) => {
                                const slot = liveSlots?.find((t) => t.start === e.target.value);
                                set({
                                  slotStart: slot?.start ?? "",
                                  slotProvider: slot?.provider ?? "",
                                  time: slot ? slotMinutes(slot.start) : null,
                                  ...(slot && b.providerId === "any" ? { provider: providerName(slot.provider) || providers[0] } : {}),
                                });
                              }}
                              aria-invalid={!!errors.time}
                              className={input}
                            >
                              <option value="">
                                {!b.date ? "Choose a date first" : loading === "times" ? "Loading times…" : liveSlots?.length ? "Select a time" : "No open times"}
                              </option>
                              {liveSlots?.map((t) => (
                                <option key={t.start} value={t.start}>
                                  {formatTime(slotMinutes(t.start))}
                                  {b.providerId === "any" && providerName(t.provider) ? ` – ${providerName(t.provider)}` : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              id="time"
                              value={b.time ?? ""}
                              disabled={!b.date}
                              onChange={(e) => set({ time: e.target.value === "" ? null : Number(e.target.value) })}
                              aria-invalid={!!errors.time}
                              className={input}
                            >
                              <option value="">{b.date ? "Select a time" : "Choose a date first"}</option>
                              {times.map((t) => (
                                <option key={t} value={t}>
                                  {formatTime(t)}
                                </option>
                              ))}
                            </select>
                          )}
                        </Field>
                      </div>
                      <p className="mt-3 text-sm text-[#4a5468]">You can always cancel or change this later if your plans change.</p>
                    </div>
                  )}
                </div>
              )}

              {!showServices && stage === 5 && (
                <div className="space-y-5">
                  <fieldset>
                    <legend className={label}>If you need a prescription, how will you receive it?</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { v: "delivery" as const, text: "Home Delivery", sub: " (free, same day)" },
                        { v: "pickup" as const, text: "Pick Up", sub: "" },
                      ].map((o) => (
                        <label key={o.v} className={cn("flex cursor-pointer items-center gap-2 rounded-[4px] border px-3 py-2.5 text-[15px]", b.delivery === o.v ? "border-[#3b5bdb] bg-[#f3f6ff]" : "border-[#e3e7ee]")}>
                          <input type="radio" name="delivery" checked={b.delivery === o.v} onChange={() => set({ delivery: o.v })} className="accent-[#3b5bdb]" />
                          {o.text}
                          {o.sub && <span className="text-xs text-[#4a5468]">{o.sub}</span>}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="relative">
                    <label htmlFor="pharmacy" className={label}>
                      Pharmacy:
                    </label>
                    <input
                      id="pharmacy"
                      role="combobox"
                      aria-expanded={pharmacyOpen}
                      aria-controls="pharmacy-list"
                      autoComplete="off"
                      placeholder="Click to select pharmacy"
                      value={pharmacyOpen ? pharmacyQuery : b.pharmacy}
                      onFocus={() => {
                        setPharmacyQuery("");
                        setPharmacyOpen(true);
                      }}
                      onClick={() => setPharmacyOpen(true)}
                      onBlur={() => setTimeout(() => setPharmacyOpen(false), 150)}
                      onChange={(e) => setPharmacyQuery(e.target.value)}
                      className={input}
                    />
                    {pharmacyOpen && (
                      <ul id="pharmacy-list" role="listbox" className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-[4px] border border-[#cfd4dc] bg-white shadow-lg">
                        {pharmacies.length === 0 && <li className="px-3 py-2 text-sm text-[#4a5468]">No pharmacies found.</li>}
                        {pharmacies.map((p) => (
                          <li key={p} role="option" aria-selected={b.pharmacy === p}>
                            <button type="button" onMouseDown={() => set({ pharmacy: p })} className="block w-full px-3 py-2 text-left text-sm text-[#1b2437] hover:bg-[#f3f6ff]">
                              {p}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 rounded-[4px] bg-[#e7f0ff] px-3 py-2 text-sm text-[#1c3faa]">Your prescription (if needed) will be faxed to the pharmacy above.</p>
                  </div>
                  <Field id="notes" label="Anything else the doctor should know? (optional)">
                    <textarea id="notes" rows={3} maxLength={500} value={b.notes} onChange={(e) => set({ notes: e.target.value })} className={cn(input, "resize-y")} />
                  </Field>
                </div>
              )}

              {stage === "confirm" && (
                <div className="space-y-5">
                  <p className="rounded-[4px] bg-[#fff3bf] px-3 py-2.5 text-[15px] text-[#5c4400]">
                    Your appointment is not booked yet. Please review the information below and confirm.{" "}
                    {live ? "It will be added to the clinic’s schedule right away." : "You should receive an email confirmation as a result."}
                  </p>
                  <Details b={b} title="Review Appointment Details:" />
                </div>
              )}

              {stage === "booked" && (
                <div className="space-y-6">
                  <Details b={b} title="Appointment successfully booked" booked reference={reference} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={downloadCalendar} className={btnOutline}>
                      <span aria-hidden="true">📅</span> Add to Calendar
                    </button>
                    <Link href="/" className={btnSolid}>
                      Return to clinic
                    </Link>
                  </div>
                  <div className="border-t border-[#eef0f4] pt-6">
                    <h3 className="text-[1.15rem] font-semibold text-[#1b2437]">We Invite Your Feedback!</h3>
                    <p className="mt-1 text-[15px] font-medium text-[#1b2437]">How are we doing?</p>
                    <p className="text-sm text-[#4a5468]">Do not include medical information in your feedback.</p>
                    <div className="mt-4 flex gap-3">
                      {(["happy", "unhappy"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          aria-pressed={feedback === f}
                          onClick={() => setFeedback(f)}
                          className={cn(
                            "grid w-24 place-items-center gap-1 rounded-[4px] py-3 text-sm font-medium text-[#1b2437] ring-2 transition",
                            f === "happy" ? "bg-[#63e6be]" : "bg-[#ffa8a8]",
                            feedback === f ? "ring-[#1b2437]" : "ring-transparent",
                          )}
                        >
                          <span className="text-2xl" aria-hidden="true">
                            {f === "happy" ? "🙂" : "🙁"}
                          </span>
                          {f === "happy" ? "Happy" : "Unhappy"}
                        </button>
                      ))}
                    </div>
                    {feedback && <p className="mt-3 text-sm text-[#2f9e44]">Thank you for your feedback!</p>}
                  </div>
                </div>
              )}

              {/* Navigation */}
              {stage !== "booked" && !showServices && (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={goBack} className={btnOutline} disabled={booking}>
                    {stage === "confirm" ? "← Previous" : "Back"}
                  </button>
                  {stage === "confirm" ? (
                    <div className="flex gap-3">
                      <Link href="/" className="rounded-[4px] px-3 py-2.5 text-[15px] text-[#c92a2a] hover:underline">
                        Cancel
                      </Link>
                      <button type="button" onClick={confirm} disabled={booking} className={btnSolid}>
                        {booking ? "Booking…" : "Book Appointment"}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={goNext} className={btnOutline}>
                      Continue <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              )}

              {stage === 1 && !showServices && (
                <p className="mt-8 text-[15px] text-[#1b2437]">
                  Looking for a different medical service?{" "}
                  <button type="button" onClick={() => setShowServices(true)} className="text-[#3b5bdb] hover:underline">
                    Click here to change service.
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* "Please Note" — shown before booking, as on the clinic's Cortico page */}
      {!agreed && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="note-title">
          <div className="w-full max-w-[600px] bg-white p-6 shadow-xl sm:p-8">
            <p id="note-title" className="font-semibold text-[#e03131]">
              Please Note:
            </p>
            <p className="mt-1 text-[15px] text-[#1b2437]">You must be located in British Columbia in order to see a healthcare provider on {clinicLocation.clinic}.</p>
            <p className="mt-4 text-[15px] text-[#1b2437]">
              {clinicLocation.clinic} is NOT to be used for medical emergencies, ICBC or work-related injuries, prolonged absence/disability forms, or controlled
              prescriptions (eg. sedatives, opioids, or stimulants including ADHD medications). Some issues are not appropriate for virtual care (eg. ear problems or
              persistent vertigo).
            </p>
            <p className="mt-4 text-[15px] text-[#1b2437]">Medical emergencies include, but are not limited to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-[15px] text-[#1b2437]">
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
            <p className="mt-4 text-[15px] font-semibold text-[#1b2437]">If you are exhibiting any such symptoms, please visit your local Emergency Department or call 911.</p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setAgreed(true)} autoFocus className={btnSolid}>
                I Agree
              </button>
              <Link href="/" className="text-[15px] text-[#3b5bdb] hover:underline">
                Back
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ id, label: text, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
      {error && <Err>{error}</Err>}
    </div>
  );
}

function Err({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-[15px] text-[#e8590c]">
      {children}
    </p>
  );
}

function Details({ b, title, booked = false, reference = "" }: { b: BookingData; title: string; booked?: boolean; reference?: string }) {
  const rows: [string, string][] = [
    ["Doctor:", b.provider],
    ["Date:", b.date ? formatDate(b.date) : ""],
    ["Time:", b.time !== null ? formatTime(b.time) : ""],
    ["Location:", locationLine(b)],
    ["Notes:", b.reason],
  ];
  if (b.formNote !== formNoteOptions[0]) rows.push(["Form / note:", b.formNote]);
  rows.push([
    "Pharmacy:",
    b.pharmacy ? `If you receive a prescription, it will be faxed to ${b.pharmacy} (${b.delivery === "delivery" ? "home delivery" : "pick up"}).` : "No pharmacy selected",
  ]);
  if (reference) rows.push(["Reference:", `#${reference}`]);
  if (booked && b.method === "video") rows.push(["Link:", "A secure video link will be emailed to you before your appointment."]);

  return (
    <div>
      <h3 className="mb-3 text-[1.05rem] font-semibold text-[#1b2437]">{title}</h3>
      <dl className="divide-y divide-[#eef0f4] rounded-[4px] border border-[#eef0f4] text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium text-[#1b2437]">{k}</dt>
            <dd className="break-words text-[#4a5468]">
              {v}
              {k === "Location:" && b.method && <span className="block text-xs">{methodLabel(b.method)}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
