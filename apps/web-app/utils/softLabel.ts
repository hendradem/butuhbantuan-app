/** Soft, full-rounded label tones (pastel bg + matching border). */

export const SOFT_LABEL =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold";

/** Soft pastel tones — slightly muted so chips don’t dominate the card. */
export const softLabelTone = {
  neutral: "bg-neutral-50/70 text-neutral-600 border-neutral-100",
  gray: "bg-neutral-50/70 text-neutral-600 border-neutral-100",
  green: "bg-emerald-50/70 text-emerald-700 border-emerald-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50/70 text-amber-700 border-amber-100",
  yellow: "bg-amber-50/70 text-amber-700 border-amber-100",
  red: "bg-red-50/70 text-red-700 border-red-100",
  orange: "bg-orange-50/70 text-orange-700 border-orange-100",
  blue: "bg-blue-50/70 text-blue-700 border-blue-100",
  sky: "bg-sky-50/70 text-sky-700 border-sky-100",
  indigo: "bg-indigo-50/70 text-indigo-700 border-indigo-100",
  violet: "bg-violet-50/70 text-violet-700 border-violet-100",
  purple: "bg-purple-50/70 text-purple-700 border-purple-100",
  pink: "bg-pink-50/70 text-pink-700 border-pink-100",
} as const;

export type SoftLabelTone = keyof typeof softLabelTone;

export function softLabelClass(tone: SoftLabelTone = "neutral") {
  return `${SOFT_LABEL} ${softLabelTone[tone]}`;
}
