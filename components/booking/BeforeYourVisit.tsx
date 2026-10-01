"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import { bimble, BimbleError, type BimbleFollowUpQuestion } from "@/lib/bimble";
import { cn } from "@/lib/ui";

const ring = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14243a]";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PICTURES = 5;
const MAX_BYTES = 8 * 1024 * 1024;

/** The preview (no Bimble booking) shows the screens with these, and sends nothing. */
const SAMPLE_QUESTIONS: BimbleFollowUpQuestion[] = [
  { id: "s1", question: "When did it start?", options: ["Today", "1–3 days ago", "4–7 days ago", "More than a week ago"], multiple: false },
  { id: "s2", question: "Which of these do you have?", options: ["Fever", "Cough", "Trouble swallowing", "Swollen glands", "None of these"], multiple: true },
  { id: "s3", question: "How bad is it?", options: ["Mild", "Moderate", "Severe"], multiple: false },
];

/**
 * After booking, as on Bimble: two optional ways to help the doctor prepare — answer the doctor's
 * follow-up questions, and add pictures of the problem. Both use the token the booking returned;
 * the preview (no token) walks through them with sample questions and sends nothing.
 */
export function BeforeYourVisit({ token, appointmentId }: { token: string; appointmentId: number | null }) {
  const [open, setOpen] = useState<"" | "questions" | "pictures">("");
  const [done, setDone] = useState({ questions: false, pictures: false });
  const live = Boolean(token && appointmentId);

  const cards = [
    { key: "questions" as const, title: "Follow-up questions", sub: "Quick prep for your doctor.", icon: <ListIcon /> },
    { key: "pictures" as const, title: "Add problem pictures", sub: "Photos of the affected area help the doctor diagnose accurately.", icon: <CameraIcon /> },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-[#f0f4f7] p-5 lg:p-6">
      <div>
        <h2 className="text-base font-extrabold">Before your visit</h2>
        <p className="mt-0.5 text-sm text-[#4a5a6e]">Takes a minute — speeds up your appointment.</p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-expanded={open === c.key}
            onClick={() => setOpen(open === c.key ? "" : c.key)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-[1.5px] bg-white px-4 py-3.5 text-left transition-colors",
              open === c.key ? "border-[#14243a]" : "border-[#e1e8ee] hover:border-[#9fb0c2]",
              ring,
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fbecc4] text-[#6b4a00]">{c.icon}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <b className="text-[15px]">{c.title}</b>
              <small className="text-[13px] leading-snug text-[#4a5a6e]">{c.sub}</small>
            </span>
            {done[c.key] && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e8f5ee] px-2 py-0.5 text-xs font-bold text-[#1f7a4a]">
                <CheckIcon className="size-3" strokeWidth={3} /> Done
              </span>
            )}
          </button>
        ))}
      </div>
      {open === "questions" && (
        <Questions
          token={token}
          appointmentId={appointmentId}
          live={live}
          onClose={() => setOpen("")}
          onDone={() => setDone((d) => ({ ...d, questions: true }))}
        />
      )}
      {open === "pictures" && (
        <Pictures
          token={token}
          appointmentId={appointmentId}
          live={live}
          onClose={() => setOpen("")}
          onDone={() => setDone((d) => ({ ...d, pictures: true }))}
        />
      )}
    </section>
  );
}

// ---- follow-up questions: one at a time ----------------------------------------------------------

function Questions({
  token,
  appointmentId,
  live,
  onClose,
  onDone,
}: {
  token: string;
  appointmentId: number | null;
  live: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [questions, setQuestions] = useState<BimbleFollowUpQuestion[] | null>(live ? null : SAMPLE_QUESTIONS);
  const [status, setStatus] = useState<"ready" | "loading" | "waiting" | "failed" | "saved">(live ? "loading" : "ready");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!live) return;
    setStatus("loading");
    setError("");
    try {
      const r = await bimble.followUpQuestions(token, appointmentId!);
      setQuestions(r.questions);
      setIndex(0);
      setStatus(r.questions.length ? "ready" : r.failed ? "failed" : "waiting");
    } catch (e) {
      setStatus("failed");
      setError(e instanceof BimbleError ? e.message : "");
    }
  };
  useEffect(() => {
    void load();
    // Load once when the panel opens; Retry loads again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!questions?.length) return;
    setBusy(true);
    setError("");
    try {
      if (live) {
        await bimble.saveFollowUp(
          token,
          appointmentId!,
          questions.map((q) => ({ q, picked: picked[q.id] ?? [], other: other[q.id] ?? "" })),
        );
      }
      setStatus("saved");
      onDone();
    } catch (e) {
      setError(e instanceof BimbleError ? e.message : "Could not save your answers. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading")
    return (
      <Panel>
        <p className="flex items-center gap-2.5 text-sm text-[#3d4d61]">
          <span className="size-4 animate-spin rounded-full border-2 border-[#d5dee6] border-t-[#14243a]" aria-hidden="true" />
          Loading your doctor’s questions…
        </p>
      </Panel>
    );
  if (status === "waiting" || status === "failed")
    return (
      <Panel>
        <p className="text-sm text-[#3d4d61]">
          {status === "waiting" ? "Your questions are being prepared. Try again in a moment." : error || "Questions could not be loaded. Retry or skip this optional step."}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => void load()} className={cn(navy, ring)}>
            Retry questions
          </button>
          <button type="button" onClick={onClose} className={cn(quiet, ring)}>
            Skip for now
          </button>
        </div>
      </Panel>
    );
  if (status === "saved")
    return (
      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f5ee] text-[#1f7a4a]">
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
          <div>
            <b className="text-[15px]">Thanks — your doctor will see your answers.</b>
            <p className="mt-0.5 text-sm text-[#4a5a6e]">{live ? "You can close this now." : "Preview only: nothing was sent."}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className={cn(quiet, "self-start", ring)}>
          Close
        </button>
      </Panel>
    );

  const list = questions ?? [];
  const q = list[index];
  if (!q) return null;
  const chosen = picked[q.id] ?? [];
  const last = index === list.length - 1;
  const toggle = (option: string) =>
    setPicked((p) => {
      const now = p[q.id] ?? [];
      // "None of these" can't go with another answer.
      const none = (o: string) => /^(none|no )/i.test(o);
      // One answer: tapping it again keeps it, as a radio button does.
      const next = !q.multiple
        ? [option]
        : now.includes(option)
          ? now.filter((o) => o !== option)
          : none(option)
            ? [option]
            : [...now.filter((o) => !none(o)), option];
      return { ...p, [q.id]: next };
    });

  return (
    <Panel>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-[13px] font-bold text-[#4a5a6e]">
          <span>
            Question {index + 1} of {list.length}
          </span>
          {!live && <span className="rounded-full bg-[#fff7e3] px-2 py-0.5 text-xs text-[#5c4400]">Sample questions</span>}
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {list.map((x, i) => (
            <span key={x.id} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-[#c18700]" : "bg-[#e1e8ee]")} />
          ))}
        </div>
      </div>

      <fieldset key={q.id} className="min-w-0">
        <legend className="text-[17px] leading-snug font-extrabold lg:text-lg">{q.question}</legend>
        <p className="mt-1 text-[13px] text-[#4a5a6e]">{q.multiple ? "Choose all that apply." : "Choose one."}</p>
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((o) => {
            const on = chosen.includes(o);
            return (
              <button
                key={o}
                type="button"
                role={q.multiple ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => toggle(o)}
                className={cn(
                  "flex min-h-[52px] items-center gap-3 rounded-[14px] border-2 px-4 py-2.5 text-left text-[15px] font-semibold transition-colors",
                  on ? "border-[#c18700] bg-[#fbecc4]" : "border-[#e1e8ee] bg-white hover:border-[#9fb0c2]",
                  ring,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-[22px] shrink-0 place-items-center border-2",
                    q.multiple ? "rounded-md" : "rounded-full",
                    on ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#9fb0c2] bg-white",
                  )}
                >
                  {on && (q.multiple ? <CheckIcon className="size-3" strokeWidth={3.5} /> : <span className="size-2 rounded-full bg-white" />)}
                </span>
                {o}
              </button>
            );
          })}
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[13px] font-bold text-[#4a5a6e]">Anything else? (optional)</span>
          <input
            value={other[q.id] ?? ""}
            onChange={(e) => setOther((x) => ({ ...x, [q.id]: e.target.value }))}
            placeholder="Add a detail in your own words"
            className="h-12 w-full rounded-xl border-0 bg-[#f0f4f7] px-3.5 text-[15px] outline-none placeholder:text-[#6b7a8c] focus:shadow-[inset_0_0_0_2px_#14243a]"
          />
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-[#b42318]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        {index > 0 && (
          <button type="button" onClick={() => setIndex(index - 1)} className={cn(quiet, ring)}>
            ← Back
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => (last ? void save() : setIndex(index + 1))}
          className={cn(navy, "ml-auto", ring)}
        >
          {last ? (busy ? "Saving…" : "Save answers") : chosen.length || other[q.id]?.trim() ? "Next →" : "Skip question →"}
        </button>
      </div>
      <button type="button" onClick={onClose} className={cn("self-center text-[13px] font-semibold text-[#4a5a6e] underline", ring)}>
        Skip for now
      </button>
    </Panel>
  );
}

// ---- pictures: take one with the camera, or choose from the gallery ------------------------------

type Picture = { file: File; url: string };

function Pictures({
  token,
  appointmentId,
  live,
  onClose,
  onDone,
}: {
  token: string;
  appointmentId: number | null;
  live: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  // "Take a photo" only where it opens a camera: computers ignore `capture` and show a file
  // picker even with a webcam, so it needs a touch device that has a camera.
  const [hasCamera, setHasCamera] = useState(false);
  useEffect(() => {
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;
    let off = false;
    const devices = navigator.mediaDevices?.enumerateDevices?.();
    if (!devices) return setHasCamera(true);
    devices
      .then((list) => !off && setHasCamera(list.some((d) => d.kind === "videoinput")))
      .catch(() => !off && setHasCamera(true));
    return () => {
      off = true;
    };
  }, []);

  const add = (list: File[]) => {
    if (!list.length) return;
    const bad = list.find((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) return setError("Use JPG, PNG, WebP or GIF pictures, each no larger than 8 MB.");
    const room = MAX_PICTURES - pictures.length;
    if (room <= 0) return setError(`You can add up to ${MAX_PICTURES} pictures.`);
    const added = list.slice(0, room).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return { file, url };
    });
    setPictures((p) => [...p, ...added]);
    setError(list.length > room ? `Only the first ${room} were added: up to ${MAX_PICTURES} pictures.` : "");
  };
  const remove = (i: number) => {
    setPictures((p) => p.filter((_, n) => n !== i));
    setError("");
  };

  const upload = async () => {
    if (!pictures.length) return setError("Take or choose a picture first, or skip this optional step.");
    setBusy(true);
    setError("");
    try {
      if (live) await bimble.uploadProblemPictures(token, appointmentId!, pictures.map((p) => p.file));
      setSent(true);
      onDone();
    } catch (e) {
      setError(e instanceof BimbleError ? e.message : "Could not upload the pictures. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f5ee] text-[#1f7a4a]">
            <CheckIcon className="size-4" strokeWidth={3} />
          </span>
          <div>
            <b className="text-[15px]">
              {pictures.length} picture{pictures.length > 1 ? "s" : ""} added for your doctor.
            </b>
            <p className="mt-0.5 text-sm text-[#4a5a6e]">{live ? "You can close this now." : "Preview only: nothing was sent."}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className={cn(quiet, "self-start", ring)}>
          Close
        </button>
      </Panel>
    );

  return (
    <Panel>
      <div>
        <b className="text-[15px]">Add a photo, if it helps</b>
        <p className="mt-0.5 text-[13px] text-[#4a5a6e]">Good light, close up, in focus. Up to {MAX_PICTURES} pictures.</p>
      </div>
      <div className={cn("grid gap-2.5", hasCamera ? "grid-cols-2" : "grid-cols-1")}>
        {hasCamera && (
          <button type="button" onClick={() => camera.current?.click()} disabled={pictures.length >= MAX_PICTURES} className={cn(pick, ring)}>
            <CameraIcon />
            Take a photo
          </button>
        )}
        <button type="button" onClick={() => gallery.current?.click()} disabled={pictures.length >= MAX_PICTURES} className={cn(pick, ring)}>
          <ImageIcon />
          Choose from gallery
        </button>
      </div>
      {/* The camera (capture), on devices that have one. */}
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {pictures.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {pictures.map((p, i) => (
            <li key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-[#f0f4f7]">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the patient's own photo */}
              <img src={p.url} alt={`Picture ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove picture ${i + 1}`}
                className={cn("absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-[#14243a]/80 text-white hover:bg-[#14243a]", ring)}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-[#b42318]">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onClose} className={cn(quiet, "shrink-0 px-4", ring)}>
          Skip for now
        </button>
        <button type="button" disabled={busy || !pictures.length} onClick={() => void upload()} className={cn(navy, "min-w-0 flex-1 px-4", ring)}>
          {busy ? "Uploading…" : pictures.length ? `Send ${pictures.length} picture${pictures.length > 1 ? "s" : ""}` : "Send pictures"}
        </button>
      </div>
    </Panel>
  );
}

// ---- pieces ----------------------------------------------------------------------------------------

const navy = "inline-flex h-12 items-center justify-center rounded-2xl bg-[#14243a] px-6 text-[15px] font-bold text-white hover:bg-[#1f3552] disabled:opacity-50";
const quiet = "inline-flex h-12 items-center justify-center rounded-2xl bg-[#f0f4f7] px-5 text-[15px] font-bold text-[#14243a] hover:bg-[#e4eaef]";
const pick =
  "flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#9fb0c2] bg-white text-[14px] font-bold text-[#14243a] hover:border-[#14243a] disabled:opacity-50";

function Panel({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 lg:p-5">{children}</div>;
}

const iconProps = { viewBox: "0 0 24 24", "aria-hidden": true, className: "size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" } as const;

function CameraIcon() {
  return (
    <svg {...iconProps}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}
