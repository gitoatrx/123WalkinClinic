"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/ui";

export type DropdownOption = { value: string; label: string };

/**
 * A select styled like the rest of the booking form (the browser's own option list can't be).
 * Keyboard: arrows move, Enter or Space picks, Escape closes, typing a letter jumps to it.
 * `anchored`: the list lines up with the nearest positioned parent (a labelled grey box)
 * instead of the button itself.
 */
export function Dropdown({
  id,
  value,
  options,
  onChange,
  placeholder = "Choose one",
  invalid,
  disabled,
  anchored,
  ariaLabel,
  className,
}: {
  id?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  anchored?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (o: DropdownOption) => {
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) pick(options[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = options.findIndex((o, n) => n > active && o.label.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : options.findIndex((o) => o.label.toLowerCase().startsWith(k));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div ref={root} className={anchored ? undefined : "relative"}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn("flex w-full cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed", className)}
      >
        <span className={cn("truncate", !selected && "font-medium text-[#8a9aac]")}>{selected?.label ?? placeholder}</span>
        <ChevronDownIcon className={cn("size-[18px] shrink-0 text-[#4a5a6e] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          id={listId}
          ref={list}
          role="listbox"
          className="absolute top-full right-0 left-0 z-30 mt-1.5 max-h-64 overflow-auto rounded-[14px] border border-[#e1e8ee] bg-white py-1.5 shadow-[0_12px_32px_rgb(20_36_58/0.16)]"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-[15px] font-semibold text-[#14243a]",
                i === active && "bg-[#f0f4f7]",
              )}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <CheckIcon className="size-4 shrink-0" strokeWidth={3} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
