/** Shared period ranges for order list filters (admin + unit). */

export const ORDER_PERIOD_PRESETS = [
  { id: "1", label: "Hari" },
  { id: "week", label: "Minggu" },
  { id: "month", label: "Bulan" },
  { id: "180", label: "6 Bulan" },
  { id: "365", label: "1 Tahun" },
  { id: "all", label: "Semua" },
  { id: "custom", label: "Kustom" },
] as const;

export type OrderPeriodId = (typeof ORDER_PERIOD_PRESETS)[number]["id"];

export type DateRange = { from: Date | null; to: Date | null };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Monday-start calendar week. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function orderPeriodRange(
  preset: OrderPeriodId,
  customFrom = "",
  customTo = "",
): DateRange {
  const now = new Date();
  const toNow = endOfDay(now);

  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "1":
      return { from: startOfDay(now), to: toNow };
    case "week":
      return { from: startOfWeek(now), to: toNow };
    case "month":
      return { from: startOfMonth(now), to: toNow };
    case "180": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 180);
      return { from, to: toNow };
    }
    case "365": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 365);
      return { from, to: toNow };
    }
    case "custom": {
      const from = customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : null;
      const to = customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : toNow;
      if (from && Number.isNaN(from.getTime())) return { from: null, to };
      if (to && Number.isNaN(to.getTime())) return { from, to: toNow };
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export function isCreatedInRange(
  iso: string | null | undefined,
  range: DateRange,
): boolean {
  if (!range.from && !range.to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t > range.to.getTime()) return false;
  return true;
}

/** YYYY-MM-DD for <input type="date"> */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
