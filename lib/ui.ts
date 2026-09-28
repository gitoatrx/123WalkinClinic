export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-5 [&>svg]:shrink-0";

export const btnPrimary = cn(btn, "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800");
export const btnSecondary = cn(btn, "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50");
export const btnOnDark = cn(btn, "bg-white text-brand-800 hover:bg-brand-50");

export const inputCls =
  "block w-full rounded-xl border-0 bg-white px-4 py-3 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none aria-invalid:ring-red-500";
