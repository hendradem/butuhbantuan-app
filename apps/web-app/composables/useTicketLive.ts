/**
 * Loads a public e-ticket by view token and keeps it fresh while the ticket is
 * running. Shared by the ticket island (map screen) and the e-ticket page.
 *
 * Polling is faster while a unit is on its way and stops once the ticket
 * reaches a terminal state or the tab goes to the background.
 */

import { loadTicketAccessPhone } from "~/utils/ticketAccess";
import { resolveCitizenPhase } from "~/utils/citizenPhase";
import type { TicketViewSource } from "~/utils/ticketView";

const TERMINAL = new Set(["completed", "cancelled"]);
const LIVE_POLL_MS = 4_000;
const IDLE_POLL_MS = 8_000;

export function useTicketLive(
  token: MaybeRefOrGetter<string>,
  opts?: { phone?: MaybeRefOrGetter<string> },
) {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBaseUrl as string;

  const viewToken = computed(() => String(toValue(token) || "").trim());
  const ticket = ref<TicketViewSource | null>(null);
  const pending = ref(true);
  const loaded = ref(false);
  const notFound = ref(false);

  const phase = computed(() => resolveCitizenPhase(ticket.value));
  const isTerminal = computed(() => TERMINAL.has(String(ticket.value?.status || "")));
  const isEnRoute = computed(() => {
    const s = String(ticket.value?.status || "");
    return s === "accepted" || s === "in_progress";
  });
  const hasLiveResponder = computed(
    () => !!(ticket.value?.responder_lat || ticket.value?.responder_lng),
  );

  function claimPhone(): string {
    return String(toValue(opts?.phone) || "").trim() || loadTicketAccessPhone(viewToken.value);
  }

  async function fetchTicket(): Promise<TicketViewSource | null> {
    const t = viewToken.value;
    if (!t) return null;
    const qs = new URLSearchParams({ _: String(Date.now()) });
    const p = claimPhone();
    if (p) qs.set("phone", p);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/order/view/${encodeURIComponent(t)}?${qs}`,
        { cache: "no-store", headers: { Accept: "application/json" } },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: TicketViewSource };
      return json?.data ?? null;
    } catch {
      return null;
    }
  }

  /** Full load — shows the skeleton and flags a missing ticket. */
  async function load() {
    if (!viewToken.value) {
      pending.value = false;
      loaded.value = true;
      notFound.value = true;
      return;
    }
    if (!ticket.value) pending.value = true;
    const data = await fetchTicket();
    if (data) {
      ticket.value = data;
      notFound.value = false;
    } else if (!ticket.value) {
      notFound.value = true;
    }
    pending.value = false;
    loaded.value = true;
  }

  /** Background refresh — never falls back to the skeleton. */
  async function refresh() {
    const data = await fetchTicket();
    if (data) ticket.value = data;
    return data;
  }

  let timer: ReturnType<typeof setInterval> | null = null;

  function pollMs(): number {
    if (!ticket.value || isTerminal.value) return 0;
    return hasLiveResponder.value || isEnRoute.value ? LIVE_POLL_MS : IDLE_POLL_MS;
  }

  function restartPolling() {
    if (timer) clearInterval(timer);
    timer = null;
    if (!import.meta.client || document.visibilityState !== "visible") return;
    const ms = pollMs();
    if (ms) timer = setInterval(() => void refresh(), ms);
  }

  function onVisibility() {
    if (document.visibilityState === "visible" && !isTerminal.value) void refresh();
    restartPolling();
  }

  watch(viewToken, () => {
    ticket.value = null;
    loaded.value = false;
    notFound.value = false;
    void load();
  });

  watch(
    () => [ticket.value?.status, isEnRoute.value, hasLiveResponder.value] as const,
    () => restartPolling(),
  );

  onMounted(() => {
    void load().then(restartPolling);
    document.addEventListener("visibilitychange", onVisibility);
  });

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  });

  return {
    ticket,
    pending,
    loaded,
    notFound,
    phase,
    isTerminal,
    isEnRoute,
    hasLiveResponder,
    load,
    refresh,
  };
}
