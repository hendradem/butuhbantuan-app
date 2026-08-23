/** Seconds between two ISO timestamps; null if either missing / invalid / inverted. */
export function secBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

/** Compact Indonesian-style duration: `45d`, `12m`, `1.5j`. */
export function formatDurationSec(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 60) return `${Math.round(sec)}d`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}j`;
}

/** mm:ss countdown (or elapsed after deadline). */
export function formatCountdownSec(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const clock = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
  return sec < 0 ? `−${clock}` : clock;
}

export type OrderTimingMetric = {
  key: string;
  label: string;
  value: string;
  tone: string;
  chip: string;
  icon: string;
};

export type OrderHistoryStamp = {
  type?: string;
  created_at?: string | null;
};

export type OrderForTiming = {
  created_at?: string | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  source?: string | null;
  sla_deadline?: string | null;
  eta_minutes?: number | null;
  dispatch_round?: number | null;
  history?: OrderHistoryStamp[] | null;
};

const ACTIVE_STATUSES = new Set(["pending", "accepted", "in_progress"]);

function firstEventAt(
  history: OrderHistoryStamp[] | null | undefined,
  types: string[],
): string | null {
  if (!history?.length) return null;
  const want = new Set(types);
  let best: string | null = null;
  let bestMs = Infinity;
  for (const ev of history) {
    if (!ev?.type || !want.has(ev.type) || !ev.created_at) continue;
    const ms = new Date(ev.created_at).getTime();
    if (!Number.isFinite(ms) || ms >= bestMs) continue;
    bestMs = ms;
    best = ev.created_at;
  }
  return best;
}

/** Prefer order columns; fill gaps from timeline events when present. */
export function resolveOrderTimestamps(
  order: OrderForTiming,
  history?: OrderHistoryStamp[] | null,
): {
  created_at: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
} {
  const h = history?.length ? history : order.history;
  return {
    created_at: order.created_at || firstEventAt(h, ["created"]),
    accepted_at: order.accepted_at || firstEventAt(h, ["accepted"]),
    arrived_at: order.arrived_at || firstEventAt(h, ["arrived"]),
    completed_at: order.completed_at || firstEventAt(h, ["completed"]),
  };
}

/**
 * Per-order KPI chips from existing order fields (+ optional history stamps).
 * Metrics without enough data are omitted. Pass `nowMs` for live SLA / elapsed.
 */
export function orderTimingMetrics(
  order: OrderForTiming | null | undefined,
  opts?: { history?: OrderHistoryStamp[] | null; nowMs?: number },
): OrderTimingMetric[] {
  if (!order) return [];

  const nowMs = opts?.nowMs ?? Date.now();
  const ts = resolveOrderTimestamps(order, opts?.history);
  const items: OrderTimingMetric[] = [];
  const status = (order.status || "").toLowerCase();

  const response = secBetween(ts.created_at, ts.accepted_at);
  if (response != null) {
    items.push({
      key: "response",
      label: "Respons",
      value: formatDurationSec(response),
      tone: response >= 900 ? "text-rose-700" : "text-neutral-800",
      chip: response >= 900 ? "bg-rose-50" : "bg-neutral-100",
      icon: "lucide:zap",
    });
  }

  const toScene = secBetween(ts.accepted_at, ts.arrived_at);
  if (toScene != null) {
    items.push({
      key: "to_scene",
      label: "OTW→lokasi",
      value: formatDurationSec(toScene),
      tone: "text-sky-800",
      chip: "bg-sky-50",
      icon: "lucide:navigation",
    });
  }

  const handling = secBetween(ts.arrived_at, ts.completed_at);
  if (handling != null) {
    items.push({
      key: "handling",
      label: "Di lokasi",
      value: formatDurationSec(handling),
      tone: "text-violet-800",
      chip: "bg-violet-50",
      icon: "lucide:map-pin",
    });
  }

  const total = secBetween(ts.created_at, ts.completed_at);
  if (total != null) {
    items.push({
      key: "total",
      label: "Total",
      value: formatDurationSec(total),
      tone: "text-emerald-800",
      chip: "bg-emerald-50",
      icon: "lucide:flag",
    });
  }

  // Time since created — only while ticket still active.
  if (ACTIVE_STATUSES.has(status) && !ts.completed_at && ts.created_at) {
    const age = secBetween(ts.created_at, new Date(nowMs).toISOString());
    if (age != null && age > 0) {
      items.push({
        key: "elapsed",
        label: "Berjalan",
        value: formatDurationSec(age),
        tone: "text-neutral-800",
        chip: "bg-neutral-100",
        icon: "lucide:clock",
      });
    }
  }

  // SLA remaining (pending) or breach vs accept time.
  if (order.sla_deadline) {
    const deadlineMs = new Date(order.sla_deadline).getTime();
    if (Number.isFinite(deadlineMs)) {
      if (status === "pending") {
        const remainSec = Math.round((deadlineMs - nowMs) / 1000);
        const breached = remainSec <= 0;
        items.push({
          key: "sla",
          label: breached ? "SLA habis" : "SLA sisa",
          value: formatCountdownSec(remainSec),
          tone: breached || remainSec <= 60 ? "text-rose-700" : remainSec <= 120 ? "text-amber-800" : "text-emerald-800",
          chip: breached || remainSec <= 60 ? "bg-rose-50" : remainSec <= 120 ? "bg-amber-50" : "bg-emerald-50",
          icon: breached ? "lucide:alarm-clock" : "lucide:timer",
        });
      } else if (ts.accepted_at) {
        const acceptedMs = new Date(ts.accepted_at).getTime();
        if (Number.isFinite(acceptedMs) && acceptedMs > deadlineMs) {
          items.push({
            key: "sla",
            label: "SLA",
            value: "Lewat",
            tone: "text-rose-700",
            chip: "bg-rose-50",
            icon: "lucide:alarm-clock",
          });
        }
      }
    }
  }

  // ETA estimate when present and still relevant.
  const eta = Number(order.eta_minutes);
  if (Number.isFinite(eta) && eta > 0 && status !== "completed" && status !== "cancelled") {
    items.push({
      key: "eta",
      label: "ETA",
      value: `±${Math.round(eta)}m`,
      tone: "text-sky-800",
      chip: "bg-sky-50",
      icon: "lucide:gauge",
    });
  }

  const round = Number(order.dispatch_round);
  if (Number.isFinite(round) && round >= 1) {
    items.push({
      key: "round",
      label: "Putaran",
      value: `R${Math.round(round)}`,
      tone: round > 1 ? "text-amber-800" : "text-neutral-700",
      chip: round > 1 ? "bg-amber-50" : "bg-neutral-100",
      icon: "lucide:refresh-cw",
    });
  }

  // Only SOS / call — skip default "manual" so the strip stays calm.
  const rawSource = (order.source || "").trim().toLowerCase();
  if (rawSource === "sos" || rawSource === "call") {
    const isSos = rawSource === "sos";
    items.push({
      key: "source",
      label: "Sumber",
      value: isSos ? "SOS" : "Telepon",
      tone: isSos ? "text-rose-700" : "text-neutral-700",
      chip: isSos ? "bg-rose-50" : "bg-neutral-100",
      icon: isSos ? "lucide:siren" : "lucide:phone",
    });
  }

  return items;
}
