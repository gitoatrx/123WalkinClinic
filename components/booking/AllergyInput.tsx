"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { XIcon } from "@/components/icons";
import { useSearch } from "@/components/booking/Combobox";
import { cn } from "@/lib/ui";

/** Allergies as Bimble stores them: one text value, "Penicillin, Peanuts". */
const parse = (value: string) => {
  const seen = new Set<string>();
  return value
    .split(/[,;\n]+/)
    .map((a) => a.trim())
    .filter((a) => {
      const key = a.toLowerCase();
      if (!a || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

type Suggestion = { id: string; name: string; detail: string };

/** Everyday allergies offered under the field: the label shown, and Bimble's catalog name saved. */
const COMMON: [string, string][] = [
  ["Penicillin", "Penicillin"],
  ["Amoxicillin", "Amoxicillin"],
  ["Sulfa drugs", "Sulfonamide antibiotics"],
  ["Codeine", "Codeine"],
  ["Aspirin", "Aspirin"],
  ["Ibuprofen", "Ibuprofen"],
  ["Latex", "Natural rubber latex"],
  ["Peanut", "Peanut"],
];

const chip = "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold";

/**
 * Allergies entered like Bimble's own booking pages: typing suggests names from Bimble's allergy
 * catalog, anything not in it can still be added as typed, and each allergy becomes a removable chip
 * inside the field (a returning patient's saved allergies show there too). Common allergies sit
 * under the field to add with one tap. "No known allergies" is cleared as soon as one is added.
 */
export function AllergyInput({
  id,
  value,
  onChange,
  noneKnown,
  onNoneKnown,
  search,
  enabled,
  maxLength = 1000,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  noneKnown: boolean;
  onNoneKnown: (none: boolean) => void;
  search: (text: string) => Promise<Suggestion[]>;
  /** Live mode: search the catalog. Otherwise allergies are only added as typed. */
  enabled: boolean;
  maxLength?: number;
}) {
  const allergies = useMemo(() => parse(value), [value]);
  // The latest value, for adds that land after a re-render (the text box's delayed blur, a chip tap).
  const latest = useRef(value);
  latest.current = value;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const typed = query.trim();
  const { items, loading } = useSearch<Suggestion>(query, search, enabled, 1);
  // Already chosen allergies are not suggested again.
  const options = items.filter((s) => !allergies.some((a) => a.toLowerCase() === s.name.toLowerCase()));
  useEffect(() => setActive(-1), [items]);

  const add = (names: string[]) => {
    const next = parse(latest.current);
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      if (!next.some((a) => a.toLowerCase() === name.toLowerCase())) next.push(name);
    }
    const text = next.join(", ");
    if (text.length <= maxLength) {
      latest.current = text;
      onChange(text);
      if (next.length) onNoneKnown(false);
    }
    setQuery("");
    setOpen(false);
  };
  const remove = (name: string) => {
    const text = parse(latest.current).filter((a) => a !== name).join(", ");
    latest.current = text;
    onChange(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && typed) {
      e.preventDefault();
      add([active >= 0 && options[active] ? options[active].name : typed]);
    } else if (e.key === "Backspace" && !query && allergies.length) {
      remove(allergies[allergies.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const has = (name: string) => allergies.some((a) => a.toLowerCase() === name.toLowerCase());
  const common = COMMON.filter(([, name]) => !has(name));

  return (
    <div>
      <div className="relative">
        {/* The chosen allergies sit inside the field, before the text box. */}
        <div
          onClick={() => document.getElementById(id)?.focus()}
          className="flex min-h-[52px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-[14px] bg-[#f0f4f7] py-2 pr-3 pl-11 focus-within:shadow-[inset_0_0_0_2px_#14243a]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute top-[26px] left-3.5 size-5 -translate-y-1/2 fill-none stroke-[#6b7a8c] stroke-2 [stroke-linecap:round]">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          {allergies.map((a) => (
            <span key={a} className={cn(chip, "h-8 bg-[#14243a] pr-1 text-white")}>
              {a}
              <button
                type="button"
                aria-label={`Remove ${a}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a);
                }}
                className="grid size-6 place-items-center rounded-full hover:bg-white/15"
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            id={id}
            role="combobox"
            aria-expanded={open && !!typed}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder={allergies.length ? "Add another" : "Search or type an allergy, e.g. penicillin"}
            onChange={(e) => {
              const text = e.target.value;
              // A comma or semicolon finishes an allergy, as in Bimble.
              if (/[,;]/.test(text)) {
                const parts = text.split(/[,;]+/);
                add(parts.slice(0, -1));
                setQuery(parts.at(-1) ?? "");
              } else setQuery(text);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() =>
              setTimeout(() => {
                // Typed but not added yet: keep it, as Bimble does.
                if (typed) add([typed]);
                setOpen(false);
              }, 150)
            }
            onKeyDown={onKeyDown}
            className="h-8 min-w-[140px] flex-1 border-0 bg-transparent text-[15px] text-[#14243a] outline-none placeholder:text-[#6b7a8c]"
          />
        </div>
        {open && typed && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-[14px] border border-[#e1e8ee] bg-white py-1.5 shadow-[0_12px_32px_rgb(20_36_58/0.16)]"
          >
            {loading && options.length === 0 && <li className="px-4 py-2.5 text-sm text-[#4a5a6e]">Searching allergies…</li>}
            {options.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add([s.name]);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("cursor-pointer px-4 py-2.5 text-[15px] font-semibold text-[#14243a]", i === active && "bg-[#f0f4f7]")}
              >
                {s.name}
                {s.detail && <span className="block text-[13px] font-medium text-[#4a5a6e]">{s.detail}</span>}
              </li>
            ))}
            {!loading && !options.some((s) => s.name.toLowerCase() === typed.toLowerCase()) && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add([typed]);
                }}
                className="cursor-pointer px-4 py-2.5 text-[15px] font-semibold text-[#8a6100] hover:bg-[#f0f4f7]"
              >
                Add “{typed}” as an allergy
              </li>
            )}
          </ul>
        )}
      </div>
      {(common.length > 0 || !allergies.length) && (
        <div className="mt-2.5">
          <span className="mb-1.5 block text-xs font-bold text-[#4a5a6e]">Common allergies</span>
          <div className="flex flex-wrap gap-1.5">
            {common.map(([label, name]) => (
              <button
                key={name}
                type="button"
                onClick={() => add([name])}
                className="h-[34px] rounded-full border border-[#d5dee6] bg-white px-3 text-[13px] font-semibold text-[#3d4d61] hover:border-[#14243a]"
              >
                + {label}
              </button>
            ))}
            {!allergies.length && (
              <button
                type="button"
                aria-pressed={noneKnown}
                onClick={() => onNoneKnown(!noneKnown)}
                className={cn(
                  "h-[34px] rounded-full border px-3 text-[13px] font-semibold",
                  noneKnown ? "border-[#14243a] bg-[#14243a] text-white" : "border-[#d5dee6] bg-white text-[#3d4d61] hover:border-[#14243a]",
                )}
              >
                No known allergies
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
