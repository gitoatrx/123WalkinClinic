"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/ui";

export type ComboOption = { key: string; label: string; sub?: string };

/**
 * A text box with a suggestion list under it (reasons, addresses, pharmacies).
 * Typing calls onChange; choosing a suggestion (click, or arrows + Enter) calls onPick.
 */
export function Combobox({
  id,
  value,
  onChange,
  onPick,
  options,
  loading = false,
  emptyText = "No matches",
  placeholder,
  invalid = false,
  className,
  listClassName,
  maxLength,
  autoComplete = "off",
}: {
  id: string;
  value: string;
  onChange: (text: string) => void;
  onPick: (option: ComboOption) => void;
  options: ComboOption[];
  loading?: boolean;
  emptyText?: string;
  placeholder?: string;
  invalid?: boolean;
  className: string;
  /** Position/width of the suggestion list, e.g. to span a surrounding box. */
  listClassName?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setActive(-1), [options]);
  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (option: ComboOption) => {
    onPick(option);
    setOpen(false);
  };
  const showList = open && (value.trim() !== "" || options.length > 0);

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && showList && active >= 0 && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {showList && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className={cn(
            "absolute z-30 max-h-64 overflow-auto rounded-[14px] border border-[#e1e8ee] bg-white py-1.5 shadow-[0_12px_32px_rgb(20_36_58/0.16)]",
            listClassName ?? "mt-1 w-full",
          )}
        >
          {loading && options.length === 0 && <li className="px-4 py-2.5 text-sm text-[#4a5a6e]">Searching…</li>}
          {!loading && options.length === 0 && <li className="px-4 py-2.5 text-sm text-[#4a5a6e]">{emptyText}</li>}
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-4 py-2.5 text-[15px] font-semibold text-[#14243a]", i === active && "bg-[#f0f4f7]")}
            >
              {o.label}
              {o.sub && <span className="block text-[13px] font-medium text-[#4a5a6e]">{o.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Runs `search` for the typed text after a short pause; the latest answer wins. */
export function useSearch<T>(text: string, search: (text: string) => Promise<T[]>, enabled: boolean, minLength = 2) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const q = text.trim();
    if (!enabled || q.length < minLength) {
      setItems([]);
      setLoading(false);
      return;
    }
    let off = false;
    setLoading(true);
    const timer = setTimeout(() => {
      search(q)
        .then((r) => {
          if (off) return;
          setItems(r);
          setFailed(false);
        })
        .catch(() => {
          if (off) return;
          setItems([]);
          setFailed(true);
        })
        .finally(() => !off && setLoading(false));
    }, 300);
    return () => {
      off = true;
      clearTimeout(timer);
    };
    // `search` is a stable module function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, minLength]);
  return { items, loading, failed };
}
