/** SLA accept-window helpers for pending dispatch offers. */

export type SlaUrgency = "breached" | "at_risk" | "ok" | "none";

const AT_RISK_MS = 60_000;

export function slaRemainingMs(deadline?: string | null, now = Date.now()): number | null {
  if (!deadline) return null;
  const t = new Date(deadline).getTime();
  if (Number.isNaN(t)) return null;
  return t - now;
}

export function slaUrgency(order: {
  status?: string;
  sla_deadline?: string | null;
  dispatch_status?: string;
}, now = Date.now()): SlaUrgency {
  if (order.status !== "pending") return "none";
  if (order.dispatch_status === "exhausted" || order.dispatch_status === "escalated") {
    return "breached";
  }
  const ms = slaRemainingMs(order.sla_deadline, now);
  if (ms == null) return "none";
  if (ms <= 0) return "breached";
  if (ms <= AT_RISK_MS) return "at_risk";
  return "ok";
}

/** Sort key: breached (most overdue) first, then at_risk (soonest), then others. */
export function slaSortKey(order: {
  status?: string;
  sla_deadline?: string | null;
  dispatch_status?: string;
  created_at?: string;
}, now = Date.now()): number {
  const u = slaUrgency(order, now);
  const ms = slaRemainingMs(order.sla_deadline, now);
  if (u === "breached") {
    // More overdue → smaller (more negative) remaining → sort first
    return (ms ?? -1e15) - 1e12;
  }
  if (u === "at_risk") {
    return (ms ?? 0) - 1e9;
  }
  return new Date(order.created_at || 0).getTime();
}
