// Client for the booking API (public/api/emr.php), which books straight into
// the clinic's Juno EMR. It defaults to /api/emr.php on the same host; set
// NEXT_PUBLIC_EMR_API to use another address. If the API can't be reached (e.g.
// `next dev`, which doesn't run PHP) or Juno isn't configured, the booking page
// stays in demo mode.

export const emrApi = process.env.NEXT_PUBLIC_EMR_API ?? "/api/emr.php";

export type EmrProvider = { id: string; name: string };
export type EmrSlot = { start: string; provider: string; duration: number };
export type EmrBookingRequest = {
  phn: string;
  dob: string;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  homePhone: string;
  sex: string;
  reason: string;
  provider: string;
  start: string;
  method: string;
  formNote: string;
  pharmacy: string;
  delivery: string;
  notes: string;
};
export type EmrBookingResult = { ok: true; appointmentId: string; provider: string; start: string; end: string };

export class EmrError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(action: string, params: Record<string, string> = {}, body?: unknown): Promise<T> {
  const url = new URL(emrApi, window.location.href);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  } catch {
    throw new EmrError("We could not reach the booking system. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new EmrError(data.error || "Something went wrong. Please try again or call the clinic.", data.code);
  return data as T;
}

export const emr = {
  async isLive() {
    if (!emrApi) return false;
    try {
      return (await request<{ live: boolean }>("status")).live;
    } catch {
      return false;
    }
  },
  providers: () => request<{ providers: EmrProvider[] }>("providers").then((r) => r.providers),
  dates: (provider: string) => request<{ dates: string[] }>("dates", { provider }).then((r) => r.dates),
  times: (provider: string, date: string) => request<{ times: EmrSlot[] }>("times", { provider, date }).then((r) => r.times),
  book: (b: EmrBookingRequest) => request<EmrBookingResult>("book", {}, b),
};

/** Minutes after midnight, read from Juno's clinic-local ISO time ("2026-09-28T09:15:00-07:00"). */
export const slotMinutes = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
