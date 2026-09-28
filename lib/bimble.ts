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
export type BimbleAddress = { street: string; unit: string; city: string; province: string; postalCode: string };
export type BimbleAllergy = { id: string; name: string; detail: string };
export type BimblePharmacy = { id: string; name: string; address: string; city: string; province: string; postalCode: string; phone: string };

export type BimbleBookingRequest = {
  phn: string;
  email: string;
  dob: string;
  firstName: string;
  lastName: string;
  sex: string;
  address: BimbleAddress;
  reason: string;
  serviceId: number | null;
  allergies: string;
  notes: string;
  visitType: BimbleVisitType;
  date: string;
  time: string;
  doctorId: number;
  /** "First available": Bimble picks the doctor who sees this reason at that time (the patient's usual doctor first). */
  firstAvailable: boolean;
  /** A pharmacy from the directory, or only a typed name when the directory can't be searched. */
  pharmacy: Partial<BimblePharmacy> & { name: string };
  delivery: "delivery" | "pickup";
  pharmacyConsent: boolean;
  emergencyContact: { name: string; phone: string; relation: string };
};

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

const intake = "/patient-intake";
const clinicPath = () => `${intake}/clinics/${encodeURIComponent(bimbleClinicSlug)}`;
const query = (params: Record<string, string | number | null | undefined>) =>
  new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === null || v === undefined || v === "" ? [] : [[k, String(v)]]))).toString();

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
  async reasons(): Promise<BimbleReason[]> {
    const rows = await request<ServiceRecord[] | { services?: ServiceRecord[] }>("/services");
    const services = Array.isArray(rows) ? rows : (rows.services ?? []);
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

  /** Open times over the next 8 days for one doctor, or merged across doctors (first doctor wins a shared time). */
  async slots(doctorIds: number[], visitType: BimbleVisitType): Promise<BimbleSlot[]> {
    const lists = await Promise.all(
      doctorIds.map(async (id) => {
        const r = await request<SlotsResponse>(`${clinicPath()}/doctors/${id}/slots?visitType=${visitType}&days=8`);
        return Object.entries(r.slots_by_date ?? {}).flatMap(([date, groups]) =>
          Object.values(groups).flatMap((times) => times.map((time) => ({ date, time, doctorId: id }))),
        );
      }),
    );
    const byStart = new Map<string, BimbleSlot>();
    for (const slot of lists.flat()) {
      const key = `${slot.date} ${slotMinutes(slot.time)}`;
      if (!byStart.has(key)) byStart.set(key, slot);
    }
    return [...byStart.values()].sort((a, b) => a.date.localeCompare(b.date) || slotMinutes(a.time) - slotMinutes(b.time));
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
      result: { address_line?: string; street_address?: string; unit_number?: string | null; city?: string; province?: string; postal_code?: string };
    }>(`/location/details?${query({ placeId, focus_bc: "true" })}`);
    return {
      street: d.address_line || d.street_address || "",
      unit: d.unit_number || "",
      city: d.city || "",
      province: d.province || "",
      postalCode: d.postal_code || "",
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
    return request<{ appointment_id: number; status: string; assigned_doctor_name?: string | null }>(`${intake}/book`, {
      method: "POST",
      token,
      body: {
        health: b.phn ? { dateOfBirth: b.dob, phn: b.phn, noPhn: false } : { dateOfBirth: b.dob, noPhn: true, emailIfNoPhn: b.email },
        profile: {
          firstName: b.firstName,
          lastName: b.lastName,
          gender: b.sex,
          addressLine: b.address.street,
          unitNumber: b.address.unit || null,
          city: b.address.city,
          province: b.address.province,
          postalCode: b.address.postalCode,
        },
        concern: { careReason: b.reason, careReasonNotes: b.notes || null, allergies: b.allergies.trim() || null, serviceId: b.serviceId },
        visit: { visitType: b.visitType, slotPreference: "preferred", appointmentDate: b.date, appointmentTime: b.time, requestedDoctorId: b.doctorId, firstAvailable: b.firstAvailable },
        booking: {
          ...(pharmacy
            ? {
                pharmacyChoice: "preferred",
                fulfillment: b.delivery,
                prescriptionPharmacyConsent: b.pharmacyConsent,
                preferredPharmacyName: pharmacy,
                preferredPharmacyAddress: b.pharmacy.address || undefined,
                preferredPharmacyCity: b.pharmacy.city || undefined,
                preferredPharmacyPostalCode: b.pharmacy.postalCode || undefined,
                preferredPharmacyPhone: b.pharmacy.phone || undefined,
              }
            : { pharmacyChoice: "later" }),
          serviceId: b.serviceId,
          allergies: b.allergies.trim() || null,
          ...(contact.name.trim() ? { emergencyContact: { name: contact.name.trim(), phone: contact.phone.trim(), relation: contact.relation || null } } : {}),
        },
      },
    });
  },
};
