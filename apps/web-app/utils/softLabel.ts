/** Soft, full-rounded label tones (pastel bg + matching border). */

export const SOFT_LABEL =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium";

export const softLabelTone = {
  neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
  gray: "bg-neutral-50 text-neutral-700 border-neutral-200",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  yellow: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-800 border-red-200",
  orange: "bg-orange-50 text-orange-800 border-orange-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  sky: "bg-sky-50 text-sky-800 border-sky-200",
  indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
  purple: "bg-purple-50 text-purple-800 border-purple-200",
  pink: "bg-pink-50 text-pink-800 border-pink-200",
} as const;

export type SoftLabelTone = keyof typeof softLabelTone;

export function softLabelClass(tone: SoftLabelTone = "neutral") {
  return `${SOFT_LABEL} ${softLabelTone[tone]}`;
}
