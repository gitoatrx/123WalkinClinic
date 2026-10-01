// Client for Bimble's public clinic booking API (/api/v1/patient-intake), the
// same API Bimble's own clinic booking pages use. Reasons, doctors and open
// times come from Bimble; the patient confirms their cell phone with a
// text-message code and the appointment is booked into the clinic in Bimble.
//
// Set at build time (the site is a static export):
//   NEXT_PUBLIC_BIMBLE_API_URL      Bimble API origin, e.g. https://api.bimble.pro
//   NEXT_PUBLIC_BIMBLE_CLINIC_SLUG  the clinic's slug in Bimble
// Without a clinic slug the booking page stays in demo mode. Bimble must list
// this site's address in APP_CORS_ORIGINS, or the browser blocks every call.

export const bimbleApi = (process.env.NEXT_PUBLIC_BIMBLE_API_URL ?? "https://api.bimble.pro").replace(/\/+$/, "");
export const bimbleClinicSlug = (process.env.NEXT_PUBLIC_BIMBLE_CLINIC_SLUG ?? "").trim().toLowerCase();

export type BimbleDoctor = { id: number; name: string };
/** Bimble visit types: "clinic" (in person) or "virtual" (video or phone). */
export type BimbleVisitType = "clinic" | "virtual";
/** One open time: date YYYY-MM-DD, time as Bimble writes it ("9:15 AM"), and the doctor who has it. */
export type BimbleSlot = { date: string; time: string; doctorId: number };
/** A reason for visit from Bimble's list; its service decides which doctors can see it. */
export type BimbleReason = { serviceId: number; label: string };
/** An address suggestion; pick one and fetch its details for the parts. */
export type BimbleAddressSuggestion = { placeId: string; main: string; secondary: string };
export type BimbleAddress = { street: string; unit: string; city: string; province: string; postalCode: string; latitude: number | null; longitude: number | null };
export type BimbleAllergy = { id: string; name: string; detail: string };
export type BimblePharmacy = { id: string; name: string; address: string; city: string; province: string; postalCode: string; phone: string };

export type BimbleBookingRequest = {
  phn: string;
  email: string;
  dob: string;
  firstName: string;
  lastName: string;
  gender: string;
  address: BimbleAddress;
  reason: string;
  serviceId: number | null;
  allergies: string;
  notes: string;
  /** Left out when unchanged since it was saved: Bimble then books the time it is already holding. */
  visit?: BimbleVisit;
  /** Bimble Pharmacy (delivered to the patient), the patient's own pharmacy, or none (a doctor's note or form). */
  pharmacyChoice: "bimble" | "own" | "none";
  /** Own pharmacy: one from the directory, or only a typed name when the directory can't be searched. */
  pharmacy: Partial<BimblePharmacy> & { name: string };
  delivery: "" | "delivery" | "pickup";
  pharmacyConsent: boolean;
  emergencyContact: { name: string; phone: string; relation: string };
};

/** The visit: a time from the chosen doctor's open times. The booking is assigned to that doctor. */
export type BimbleVisit = { visitType: BimbleVisitType; doctorId: number; date: string; time: string };

/** Reason in the patient's own words, matched to Bimble's list ("Something else"). */
export type BimbleConcernMatch = { reason: string; serviceId: number; notes: string; options: { reason: string; serviceId: number }[] };

/** One of the doctor's questions before the visit, with the answers to choose from. */
export type BimbleFollowUpQuestion = { id: string; question: string; options: string[]; multiple: boolean };

export class BimbleError extends Error {
  constructor(
    message: string,
    public status = 0,
    /** The form field Bimble objected to, when it says (e.g. "phn", "dateOfBirth"). */
    public field = "",
  ) {
    super(message);
  }
}

/** What Bimble already knows about a returning patient, after the phone is verified. */
export type BimbleKnownPatient = {
  existing: boolean;
  name: string;
  firstName: string;
  lastName: string;
  gender: string;
  addressLine: string;
  unitNumber: string;
  city: string;
  province: string;
  postalCode: string;
  allergies: string;
  /** The pharmacy their last booking here used, if any. */
  savedPharmacy: BimblePharmacy | null;
  /** The emergency contact their last booking here gave, if any. */
  savedEmergencyContact: { name: string; phone: string; relation: string } | null;
};

type DoctorsResponse = {
  clinic: { allowed_visit_types?: string[] };
  doctors: { doctor_id: number; display_name?: string; first_name?: string; last_name?: string }[];
};
type SlotsResponse = { dates: string[]; slots_by_date?: Record<string, Record<string, string[]>> };
type ServiceRecord = {
  service_id: number;
  service_name?: string;
  is_active?: boolean;
  display_reasons?: { reason_key?: string; reason_label?: string }[] | null;
};

/** Bimble errors carry `detail` as a string, a list of validation errors, or `{ field, message }`. */
function errorMessage(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg.replace(/^Value error, /, "");
  }
  if (detail && typeof detail === "object") {
    const { message } = detail as { message?: unknown };
    if (typeof message === "string" && message) return message;
  }
  return "Something went wrong. Please try again or call the clinic.";
}

/** `path` is below /api/v1, e.g. "/patient-intake/book". */
async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${bimbleApi}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new BimbleError("We could not reach the booking system. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 429) throw new BimbleError("Too many attempts. Please wait a few minutes and try again, or call the clinic.", 429);
    const field = (data as { detail?: { field?: unknown } } | null)?.detail?.field;
    throw new BimbleError(errorMessage(data), res.status, typeof field === "string" ? field : "");
  }
  return data as T;
}

/** A call to Bimble's patient API with the token the booking returned (JSON, or a form with files). */
async function fetchPatient<T = unknown>(path: string, token: string, init: { method?: string; body?: string | FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${bimbleApi}/api/v1${path}`, {
      method: init.method ?? "GET",
      headers: { Accept: "application/json", ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...patientAuth(token) },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    throw new BimbleError("We could not reach the booking system. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new BimbleError(errorMessage(data), res.status);
  return data as T;
}

const intake = "/patient-intake";
const clinicPath = () => `${intake}/clinics/${encodeURIComponent(bimbleClinicSlug)}`;
const query = (params: Record<string, string | number | null | undefined>) =>
  new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === null || v === undefined || v === "" ? [] : [[k, String(v)]]))).toString();

const visitBody = (v: BimbleVisit) => ({
  visitType: v.visitType,
  slotPreference: "preferred",
  appointmentDate: v.date,
  appointmentTime: v.time,
  requestedDoctorId: v.doctorId,
});

/** Both headers Bimble's patient pages send with the patient's token. */
const patientAuth = (token: string) => ({ Authorization: `Bearer ${token}`, "X-Bimble-Authorization": `Bearer ${token}` });

/** Minutes after midnight for Bimble's "9:15 AM" slot labels. */
export function slotMinutes(label: string) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(label.trim());
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return h * 60 + Number(m[2]);
}

export const bimble = {
  live: bimbleClinicSlug !== "",

  /** Reasons for visit, as Bimble's own booking pages list them (one per display reason of each active service). */
  /**
   * Reasons a patient can pick, in Bimble's words. When the clinic has chosen the services it
   * offers in Bimble, only those; otherwise Bimble's full list.
   */
  async reasons(): Promise<BimbleReason[]> {
    const [rows, offered] = await Promise.all([
      request<ServiceRecord[] | { services?: ServiceRecord[] }>("/services"),
      request<{ clinic?: { services?: { service_id?: unknown }[] } }>(clinicPath())
        .then((r) => new Set((r.clinic?.services ?? []).map((x) => Number(x.service_id)).filter((id) => Number.isInteger(id) && id > 0)))
        .catch(() => new Set<number>()), // the full list still works if the clinic's own can't load
    ]);
    const all = Array.isArray(rows) ? rows : (rows.services ?? []);
    const services = offered.size ? all.filter((s) => offered.has(s.service_id)) : all;
    const seen = new Set<string>();
    const out: BimbleReason[] = [];
    for (const s of services) {
      if (s.is_active === false) continue;
      const labels = s.display_reasons?.length ? s.display_reasons.map((r) => r.reason_label ?? "") : [s.service_name ?? ""];
      for (const raw of labels) {
        const label = raw.trim();
        if (!label || seen.has(label.toLowerCase())) continue;
        seen.add(label.toLowerCase());
        out.push({ serviceId: s.service_id, label });
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  },

  /** Doctors that take online bookings (for this reason, when given), and the visit types the clinic accepts ("virtual", "walkin"). */
  async doctors(reason?: BimbleReason | null) {
    const q = reason ? `?${query({ serviceId: reason.serviceId, careReason: reason.label })}` : "";
    const r = await request<DoctorsResponse>(`${clinicPath()}/doctors${q}`);
    return {
      visitTypes: r.clinic?.allowed_visit_types ?? ["virtual", "walkin"],
      doctors: r.doctors.map<BimbleDoctor>((d) => ({
        id: d.doctor_id,
        name: d.display_name?.trim() || [d.first_name, d.last_name].filter(Boolean).join(" ") || `Doctor ${d.doctor_id}`,
      })),
    };
  },

  /** Open times over the next 8 days for one doctor, or merged across doctors (a time several doctors share goes to one of them at random). */
  async slots(doctorIds: number[], visitType: BimbleVisitType): Promise<BimbleSlot[]> {
    const settled = await Promise.allSettled(
      doctorIds.map(async (id) => {
        const r = await request<SlotsResponse>(`${clinicPath()}/doctors/${id}/slots?visitType=${visitType}&days=8`);
        return Object.entries(r.slots_by_date ?? {}).flatMap(([date, groups]) =>
          Object.values(groups).flatMap((times) => times.map((time) => ({ date, time, doctorId: id }))),
        );
      }),
    );
    // A doctor whose times fail to load is left out; only when every one fails is it an error.
    const lists = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (!lists.length && settled.length) throw (settled[0] as PromiseRejectedResult).reason;
    // A shared time goes to a doctor picked at random (reservoir sampling), so the doctor
    // listed first doesn't take every tie.
    const byStart = new Map<string, { slot: BimbleSlot; seen: number }>();
    for (const slot of lists.flat()) {
      const key = `${slot.date} ${slotMinutes(slot.time)}`;
      const held = byStart.get(key);
      if (!held) byStart.set(key, { slot, seen: 1 });
      else {
        held.seen += 1;
        if (Math.random() < 1 / held.seen) held.slot = slot;
      }
    }
    return [...byStart.values()]
      .map((x) => x.slot)
      .sort((a, b) => a.date.localeCompare(b.date) || slotMinutes(a.time) - slotMinutes(b.time));
  },

  /** Address suggestions in BC (Bimble's address search, as its own booking pages use). */
  async searchAddress(text: string): Promise<BimbleAddressSuggestion[]> {
    const r = await request<{ results?: { place_id?: string; structured_formatting?: { main_text?: string; secondary_text?: string }; display_name?: string }[] }>(
      `/location/search?${query({ q: text, limit: 8, countrycodes: "ca", focus_bc: "true" })}`,
    );
    return (r.results ?? [])
      .filter((x) => x.place_id)
      .map((x) => ({
        placeId: x.place_id!,
        main: x.structured_formatting?.main_text || x.display_name || "",
        secondary: x.structured_formatting?.secondary_text || "",
      }));
  },

  /** Street, city, province and postal code for a picked suggestion. */
  async addressDetails(placeId: string): Promise<BimbleAddress> {
    const { result: d } = await request<{
      result: {
        address_line?: string;
        street_address?: string;
        unit_number?: string | null;
        city?: string;
        province?: string;
        postal_code?: string;
        latitude?: number | null;
        longitude?: number | null;
      };
    }>(`/location/details?${query({ placeId, focus_bc: "true" })}`);
    return {
      street: d.address_line || d.street_address || "",
      unit: d.unit_number || "",
      city: d.city || "",
      province: d.province || "",
      postalCode: d.postal_code || "",
      latitude: typeof d.latitude === "number" ? d.latitude : null,
      longitude: typeof d.longitude === "number" ? d.longitude : null,
    };
  },

  /** Allergies from Bimble's catalog matching the text, as its own booking pages suggest them. */
  async searchAllergies(text: string): Promise<BimbleAllergy[]> {
    const r = await request<{ items?: { catalog_allergy_id?: number; id?: number; canonical_name?: string; name?: string; category?: string | null; subcategory?: string | null }[] }>(
      `/allergy-catalog?${query({ q: text, limit: 12 })}`,
    );
    return (r.items ?? [])
      .map((a) => ({
        id: String(a.catalog_allergy_id ?? a.id ?? a.canonical_name ?? a.name),
        name: (a.canonical_name || a.name || "").trim(),
        detail: [a.category, a.subcategory].filter(Boolean).join(" / "),
      }))
      .filter((a) => a.name);
  },

  /** Pharmacies a prescription can be sent to, matching the text (name, address, city or postal code). */
  async searchPharmacies(text: string): Promise<BimblePharmacy[]> {
    const r = await request<{
      pharmacies: { id: string; name: string; address?: string; city?: string; province?: string | null; postal_code?: string | null; phone?: string | null }[];
    }>(`${intake}/pharmacies?${query({ q: text, limit: 20 })}`);
    return r.pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address ?? "",
      city: p.city ?? "",
      province: p.province ?? "",
      postalCode: p.postal_code ?? "",
      phone: p.phone ?? "",
    }));
  },

  /**
   * Texts a verification code to the patient's cell phone. The phone is verified before the reason
   * is chosen, so Bimble gets its own placeholder reason here; the real one is sent with the booking.
   */
  startPhone(phone: string) {
    return request<{ intake_session_id: number; masked_phone: string; dev_otp?: string | null }>(`${intake}/phone/start`, {
      method: "POST",
      body: { phone, careReason: "General consultation", clinicSlug: bimbleClinicSlug, promotionalEmailsConsent: false },
    });
  },

  /**
   * Checks the health card (or email) and date of birth against the verified phone, as Bimble's own
   * booking pages do. A returning patient must match their record, or Bimble refuses with a message
   * for the field that is wrong; their details come back so the form can be filled in.
   */
  async checkIdentity(token: string, health: { dob: string; phn: string; email: string }): Promise<BimbleKnownPatient> {
    const body = health.phn
      ? { health: { dateOfBirth: health.dob, phn: health.phn, noPhn: false } }
      : { health: { dateOfBirth: health.dob, noPhn: true, emailIfNoPhn: health.email } };
    const { snapshot: s } = await request<{ snapshot: Record<string, unknown> }>(`${intake}/session`, { method: "PATCH", token, body });
    const text = (key: string) => (typeof s[key] === "string" ? (s[key] as string) : "");
    const saved = (s.saved_pharmacy ?? null) as { name?: string; address?: string; city?: string; postal_code?: string | null; phone?: string | null } | null;
    const contact = (s.saved_emergency_contact ?? null) as { name?: string; phone?: string | null; relation?: string | null } | null;
    return {
      existing: s.existing_patient === true && !!s.existing_patient_id,
      name: text("existing_patient_name"),
      firstName: text("first_name"),
      lastName: text("last_name"),
      gender: text("gender"),
      addressLine: text("address_line"),
      unitNumber: text("unit_number"),
      city: text("city"),
      province: text("province"),
      postalCode: text("postal_code"),
      allergies: text("allergies"),
      savedPharmacy: saved?.name
        ? { id: "saved", name: saved.name, address: saved.address ?? "", city: saved.city ?? "", province: "", postalCode: saved.postal_code ?? "", phone: saved.phone ?? "" }
        : null,
      savedEmergencyContact: contact?.name ? { name: contact.name, phone: contact.phone ?? "", relation: contact.relation ?? "" } : null,
    };
  },

  /**
   * "Something else": matches the patient's own words to a reason in Bimble's list, as Bimble's
   * clinic booking does. When more than one reason fits, `options` lists them to choose from.
   */
  async matchConcern(text: string): Promise<BimbleConcernMatch> {
    const r = await request<{
      care_reason: string;
      service_id: number;
      care_reason_notes?: string;
      requires_primary_selection?: boolean;
      primary_concern_options?: { concern: string; service_id: number }[];
    }>(`${intake}/concern/resolve`, { method: "POST", body: { transcript: text } });
    return {
      reason: r.care_reason,
      serviceId: r.service_id,
      notes: r.care_reason_notes ?? "",
      options: r.requires_primary_selection ? (r.primary_concern_options ?? []).map((o) => ({ reason: o.concern, serviceId: o.service_id })) : [],
    };
  },

  /**
   * Saves the reason, doctor and time for the verified patient, as Bimble's own booking does on
   * Continue: Bimble checks the time now (too close, taken, another booking of theirs) and holds
   * it with that doctor while the patient finishes.
   */
  async saveVisit(token: string, h: { reason: string; serviceId: number | null; visit: BimbleVisit }) {
    await request<{ snapshot: Record<string, unknown> }>(`${intake}/session`, {
      method: "PATCH",
      token,
      body: { concern: { careReason: h.reason, serviceId: h.serviceId }, visit: visitBody(h.visit) },
    });
  },

  /** The doctor's questions for this booking (Bimble may still be preparing them). */
  async followUpQuestions(token: string, appointmentId: number) {
    const r = await fetchPatient<{ questions?: { id: string; question: string; options?: string[]; allow_multiple?: boolean; allowMultiple?: boolean }[]; generation_status?: string }>(
      `/patient/appointments/${appointmentId}/follow-up/questions`,
      token,
    );
    return {
      questions: (r.questions ?? []).map<BimbleFollowUpQuestion>((q) => ({ id: q.id, question: q.question, options: q.options ?? [], multiple: Boolean(q.allow_multiple ?? q.allowMultiple) })),
      failed: r.generation_status === "FAILED",
    };
  },

  /** Saves the answers, in the shape Bimble's own preparation screen sends. */
  saveFollowUp(token: string, appointmentId: number, answers: { q: BimbleFollowUpQuestion; picked: string[]; other: string }[]) {
    return fetchPatient(`/patient/appointments/${appointmentId}/follow-up`, token, {
      method: "POST",
      body: JSON.stringify({
        answers: answers.map(({ q, picked, other }) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          selected_options: picked,
          other_text: other.trim() || null,
          answer: [...picked, other.trim()].filter(Boolean).join("; "),
        })),
      }),
    });
  },

  /** Photos of the problem for the doctor: up to 5 JPG, PNG, WebP or GIF images, 8 MB each. */
  uploadProblemPictures(token: string, appointmentId: number, files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return fetchPatient(`/patient/appointments/${appointmentId}/follow-up/images`, token, { method: "POST", body: form });
  },

  /** Checks the code; the returned token authorizes this one booking. */
  verifyPhone(intakeSessionId: number, code: string) {
    return request<{ access_token: string }>(`${intake}/phone/verify`, {
      method: "POST",
      body: { intakeSessionId, otpCode: code },
    });
  },

  /** Creates (or finds) the patient and books the appointment into the clinic. */
  book(token: string, b: BimbleBookingRequest) {
    const pharmacy = b.pharmacy.name.trim();
    const contact = b.emergencyContact;
    const location = b.address.latitude !== null && b.address.longitude !== null ? { patientLatitude: b.address.latitude, patientLongitude: b.address.longitude } : {};
    return request<{ appointment_id: number; status: string; patient_access_token?: string; upload_problem_images?: boolean }>(`${intake}/book`, {
      method: "POST",
      token,
      body: {
        health: b.phn ? { dateOfBirth: b.dob, phn: b.phn, noPhn: false } : { dateOfBirth: b.dob, noPhn: true, emailIfNoPhn: b.email },
        profile: {
          firstName: b.firstName,
          lastName: b.lastName,
          gender: b.gender,
          addressLine: b.address.street,
          unitNumber: b.address.unit || null,
          city: b.address.city,
          province: b.address.province,
          postalCode: b.address.postalCode,
        },
        concern: { careReason: b.reason, careReasonNotes: b.notes || null, allergies: b.allergies.trim() || null, serviceId: b.serviceId },
        ...(b.visit ? { visit: visitBody(b.visit) } : {}),
        booking: {
          ...(b.pharmacyChoice === "none"
            ? // Nothing to send to a pharmacy: Bimble takes "later" from a clinic's own site, with no consent.
              { pharmacyChoice: "later" }
            : b.pharmacyChoice === "bimble"
            ? { pharmacyChoice: "bimble", fulfillment: "delivery", prescriptionPharmacyConsent: b.pharmacyConsent }
            : {
                pharmacyChoice: "preferred",
                fulfillment: b.delivery || undefined,
                prescriptionPharmacyConsent: b.pharmacyConsent,
                preferredPharmacyName: pharmacy,
                preferredPharmacyAddress: b.pharmacy.address || undefined,
                preferredPharmacyCity: b.pharmacy.city || undefined,
                preferredPharmacyPostalCode: b.pharmacy.postalCode || undefined,
                preferredPharmacyPhone: b.pharmacy.phone || undefined,
              }),
          ...location,
          serviceId: b.serviceId,
          allergies: b.allergies.trim() || null,
          ...(contact.name.trim() ? { emergencyContact: { name: contact.name.trim(), phone: contact.phone.trim(), relation: contact.relation || null } } : {}),
        },
      },
    });
  },
};
