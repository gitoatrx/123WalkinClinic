// Client for Bimble's public clinic booking API (/api/v1/patient-intake), the
// same API Bimble's own clinic booking pages use. Doctors and open times come
// from the clinic's Bimble schedule; the patient confirms their cell phone with
// a text-message code and the appointment is booked into the clinic in Bimble.
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

export type BimbleBookingRequest = {
  phn: string;
  email: string;
  dob: string;
  firstName: string;
  lastName: string;
  sex: string;
  reason: string;
  allergies: string;
  notes: string;
  visitType: BimbleVisitType;
  date: string;
  time: string;
  doctorId: number;
  pharmacy: string;
  delivery: "delivery" | "pickup";
  pharmacyConsent: boolean;
};

export class BimbleError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

type DoctorsResponse = {
  clinic: { allowed_visit_types?: string[] };
  doctors: { doctor_id: number; display_name?: string; first_name?: string; last_name?: string }[];
};
type SlotsResponse = { dates: string[]; slots_by_date?: Record<string, Record<string, string[]>> };

/** FastAPI errors carry `detail` as a string, or as a list of validation errors. */
function errorMessage(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg.replace(/^Value error, /, "");
  }
  return "Something went wrong. Please try again or call the clinic.";
}

async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${bimbleApi}/api/v1/patient-intake${path}`, {
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
    throw new BimbleError(errorMessage(data), res.status);
  }
  return data as T;
}

const clinicPath = () => `/clinics/${encodeURIComponent(bimbleClinicSlug)}`;

/** Minutes after midnight for Bimble's "9:15 AM" slot labels. */
export function slotMinutes(label: string) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(label.trim());
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return h * 60 + Number(m[2]);
}

export const bimble = {
  live: bimbleClinicSlug !== "",

  /** Doctors that take online bookings, and the visit types the clinic accepts ("virtual", "walkin"). */
  async doctors() {
    const r = await request<DoctorsResponse>(`${clinicPath()}/doctors`);
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

  /** Texts a verification code to the patient's cell phone. */
  startPhone(phone: string, reason: string) {
    return request<{ intake_session_id: number; masked_phone: string; dev_otp?: string | null }>("/phone/start", {
      method: "POST",
      body: { phone, careReason: reason, clinicSlug: bimbleClinicSlug, promotionalEmailsConsent: false },
    });
  },

  /** Checks the code; the returned token authorizes this one booking. */
  verifyPhone(intakeSessionId: number, code: string) {
    return request<{ access_token: string }>("/phone/verify", {
      method: "POST",
      body: { intakeSessionId, otpCode: code },
    });
  },

  /** Creates (or finds) the patient and books the appointment into the clinic. */
  book(token: string, b: BimbleBookingRequest) {
    const pharmacy = b.pharmacy.trim();
    return request<{ appointment_id: number; status: string; assigned_doctor_name?: string | null }>("/book", {
      method: "POST",
      token,
      body: {
        health: b.phn ? { dateOfBirth: b.dob, phn: b.phn, noPhn: false } : { dateOfBirth: b.dob, noPhn: true, emailIfNoPhn: b.email },
        // Clinic bookings may leave the home address for the clinic to collect.
        profile: { deferAddress: true, firstName: b.firstName, lastName: b.lastName, gender: b.sex, addressLine: "", city: "", province: "BC", postalCode: "" },
        concern: { careReason: b.reason, careReasonNotes: b.notes || null, allergies: b.allergies.trim() || null },
        visit: { visitType: b.visitType, slotPreference: "preferred", appointmentDate: b.date, appointmentTime: b.time, requestedDoctorId: b.doctorId },
        booking: pharmacy
          ? { pharmacyChoice: "preferred", fulfillment: b.delivery, prescriptionPharmacyConsent: b.pharmacyConsent, preferredPharmacyName: pharmacy }
          : { pharmacyChoice: "later" },
      },
    });
  },
};
