<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { buildUnitWaMessage, waDeepLink } from "~/utils/waContact";

import {
  CITIZEN_PHASE_HINT,
  resolveCitizenPhase,
} from "~/utils/citizenPhase";

const props = withDefaults(
  defineProps<{
    ticketNumber: string;
    via?: string;
    to?: string;
  }>(),
  { via: "", to: "" },
);

const emit = defineEmits<{ close: [] }>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const toast = appToast();

const ticketNum = computed(() => String(props.ticketNumber || "").trim());
const via = computed(() => String(props.via || "").trim());
const to = computed(() => String(props.to || "").trim());

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiBase + url;
}

function goHome() {
  toast.dismiss();
  emit("close");
}

onBeforeUnmount(() => {
  toast.dismiss();
});

const { phone, load: loadProfile } = useRequesterProfile();
loadProfile();

async function fetchTicket() {
  const number = ticketNum.value;
  if (!number || number === "undefined" || number === "null") return null;

  // Use query `phone` (not custom header) to avoid CORS preflight failures
  // when the API AllowHeaders list is stale or the browser blocks X-Requester-Phone.
  const qs = new URLSearchParams();
  const p = phone.value?.trim();
  if (p) qs.set("phone", p);
  const q = qs.toString();
  const url = `${config.public.apiBaseUrl}/api/v1/order/ticket/${encodeURIComponent(number)}${q ? `?${q}` : ""}`;

  try {
    const res = await $fetch<{ data: any }>(url);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

const { data: ticket, pending, error, refresh } = await useAsyncData(
  () => `eticket-${ticketNum.value}`,
  fetchTicket,
  { watch: [ticketNum] },
);

/** Only block UI on first load — polling refresh must not swap to skeleton. */
const showSkeleton = computed(() => pending.value && !ticket.value);
const isRefreshing = ref(false);

async function softRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    // Bypass Nuxt cache merge — assign fresh payload so live GPS always applies.
    const fresh = await fetchTicket();
    if (fresh) {
      ticket.value = fresh;
    } else {
      await refresh();
    }
  } finally {
    isRefreshing.value = false;
  }
}

const citizenPhase = computed(() => resolveCitizenPhase(ticket.value));
const phaseHint = computed(() => CITIZEN_PHASE_HINT[citizenPhase.value] ?? "");

/** Process strip — phase-colored Soft UI banner (matches petugas share-loc). */
const urgencyBanner = computed(() => {
  switch (citizenPhase.value) {
    case "completed":
      return { text: "Tiket selesai", tone: "bg-neutral-700" };
    case "cancelled":
      return { text: "Tiket dibatalkan", tone: "bg-slate-600" };
    case "on_scene":
      return {
        text: hasLiveResponder.value
          ? "Penanganan · GPS live"
          : "Penanganan di lokasi",
        tone: "bg-violet-600",
      };
    case "in_progress":
      return { text: "Unit menuju lokasi", tone: "bg-blue-600" };
    case "accepted":
      return { text: "Unit menerima", tone: "bg-amber-600" };
    case "exhausted":
      return { text: "Belum ada unit merespons — hubungi manual", tone: "bg-orange-600" };
    case "escalated_psc":
      return { text: "Dieskalasi ke pusat darurat (PSC)", tone: "bg-violet-600" };
    case "reassigned":
      return { text: "Dialihkan ke unit lain", tone: "bg-slate-700" };
    default:
      return null;
  }
});

const cardTitle = computed(() => {
  const t = ticket.value;
  if (!t) return "E-Tiket";
  if (t.unit_name) return t.unit_name;
  if (citizenPhase.value === "searching") return "Mencari unit";
  return "Bantuan darurat";
});

const cardSubtitle = computed(() => {
  if (citizenPhase.value === "completed") {
    return "Tiket ditutup · live lokasi dihentikan";
  }
  if (citizenPhase.value === "cancelled") {
    return "Tiket tidak dilanjutkan";
  }
  if (etaLabel.value && isEnRoute.value && citizenPhase.value !== "on_scene") {
    return `ETA ${etaLabel.value}`;
  }
  return phaseHint.value;
});

const previewRows = computed(() => {
  const t = ticket.value;
  if (!t) return [] as { key: string; title: string; detail: string }[];
  const rows: { key: string; title: string; detail: string }[] = [];
  if (t.requester_name) {
    rows.push({
      key: "pelapor",
      title: t.requester_name,
      detail: t.requester_phone || "Pelapor",
    });
  }
  if (t.location) {
    rows.push({ key: "lokasi", title: "Lokasi", detail: t.location });
  }
  if (t.condition) {
    rows.push({ key: "kondisi", title: "Kondisi", detail: t.condition });
  }
  return rows.slice(0, 2);
});

const showDetails = ref(false);

function buildWAMessage(t: any) {
  return buildUnitWaMessage({
    unitName: t.unit_name,
    ticketNumber: t.ticket_number,
    requesterName: t.requester_name,
    requesterPhone: t.requester_phone,
    address: t.location,
    condition: t.condition,
    lat: t.requester_lat,
    lng: t.requester_lng,
  });
}

const waUrl = computed(() => {
  if (!ticket.value || via.value !== "whatsapp" || !to.value) return "";
  return waDeepLink(to.value, buildWAMessage(ticket.value));
});

// ── Follow-up when unit does not respond within SLA ───────────────────────────
const nowTick = ref(Date.now());
let slaTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const slaPassed = computed(() => {
  const deadline = ticket.value?.sla_deadline;
  if (!deadline) return false;
  return nowTick.value >= new Date(deadline).getTime();
});

const needsFollowUp = computed(() => {
  const t = ticket.value;
  if (!t || t.status !== "pending") return false;
  return t.dispatch_status === "exhausted" || slaPassed.value || (t.dispatch_round ?? 0) >= 2;
});

// Resolve unit contact from ticket enrichment, query params, or emergency directory.
const unitWhatsappNumber = ref("");
const unitPhoneNumber = ref("");

const isEnRoute = computed(() => {
  const s = ticket.value?.status;
  return s === "accepted" || s === "in_progress";
});

const etaLabel = computed(() => {
  const mins = Number(ticket.value?.eta_minutes) || 0;
  if (mins <= 0) return null;
  if (mins < 60) return `±${mins} menit`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `±${h} jam ${m} mnt` : `±${h} jam`;
});

const unitWaUrl = computed(() => {
  const t = ticket.value;
  if (!t || !unitWhatsappNumber.value) return "";
  return waDeepLink(unitWhatsappNumber.value, buildWAMessage(t));
});

async function resolveUnitContact() {
  const t = ticket.value;
  if (!t) {
    unitWhatsappNumber.value = "";
    unitPhoneNumber.value = "";
    return;
  }

  const fromTicketWa = String(t.unit_whatsapp || "").trim();
  const fromTicketPhone = String(t.unit_phone || "").trim();
  const fromQuery = String(to.value || "").trim();

  let whatsapp = fromTicketWa || fromTicketPhone || (via.value === "whatsapp" ? fromQuery : "");
  let phone = fromTicketPhone || fromTicketWa || (via.value === "phone" ? fromQuery : "") || whatsapp;

  if ((!whatsapp && !phone) && t.emergency_uuid) {
    try {
      const res = await $fetch<{ data: any[] }>(`${apiBase}/api/v1/emergency/`);
      const unit = (res.data ?? []).find((e: any) => e.id === t.emergency_uuid);
      const c = unit?.contact;
      if (c) {
        whatsapp = String(c.whatsapp || c.phone || "").trim();
        phone = String(c.phone || c.whatsapp || "").trim();
      }
    } catch {
      // ignore — button will stay hidden if no number
    }
  }

  unitWhatsappNumber.value = whatsapp;
  unitPhoneNumber.value = phone || whatsapp;
}

watch(
  () => [ticket.value?.id, ticket.value?.emergency_uuid, ticket.value?.unit_whatsapp, ticket.value?.unit_phone, to.value, via.value],
  () => { resolveUnitContact(); },
  { immediate: true }
);

/** Citizen-meaningful events only — skip noisy offered/created duplicates. */
const CITIZEN_HISTORY_TYPES = new Set([
  "reassigned",
  "accepted",
  "rejected",
  "in_progress",
  "arrived",
  "completed",
  "cancelled",
  "exhausted",
  "escalated_psc",
]);

const historyItems = computed(() => {
  const list = [...(ticket.value?.history ?? [])];
  list.sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const filtered = list.filter((ev: any) => CITIZEN_HISTORY_TYPES.has(ev.type));
  // Fallback: if nothing meaningful yet, keep created so the section isn't empty mid-search.
  return filtered.length ? filtered : list.filter((ev: any) => ev.type === "created").slice(-1);
});

const historyExpanded = ref(false);
const HISTORY_PREVIEW = 2;

const visibleHistory = computed(() => {
  const items = historyItems.value;
  if (historyExpanded.value || items.length <= HISTORY_PREVIEW) return items;
  return items.slice(-HISTORY_PREVIEW);
});

const hiddenHistoryCount = computed(() =>
  Math.max(0, historyItems.value.length - HISTORY_PREVIEW)
);

const moreDetailCount = computed(() => {
  let n = 0;
  const t = ticket.value;
  if (!t) return 0;
  if (t.photo_url) n += 1;
  if (t.handler_name || t.handling_notes) n += 1;
  if (historyItems.value.length) n += 1;
  const totalInfo =
    (t.requester_name ? 1 : 0) + (t.location ? 1 : 0) + (t.condition ? 1 : 0);
  n += Math.max(0, totalInfo - previewRows.value.length);
  return n;
});

function historyTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function historyShort(ev: { type?: string; message?: string; to_unit?: string; from_unit?: string }) {
  switch (ev.type) {
    case "reassigned":
      return ev.to_unit ? `Dialihkan ke ${ev.to_unit}` : "Dialihkan ke unit lain";
    case "accepted":
      return ev.to_unit ? `${ev.to_unit} menerima` : "Unit menerima";
    case "rejected":
      return ev.from_unit ? `${ev.from_unit} menolak` : "Unit menolak";
    case "in_progress":
      return "Unit menuju lokasi";
    case "arrived":
      return "Petugas sudah sampai — penanganan berlangsung";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Dibatalkan";
    case "exhausted":
      return "Belum ada unit yang merespons";
    case "escalated_psc":
      return "Dieskalasi ke pusat darurat";
    case "created":
      return "Tiket dibuat";
    default:
      return ev.message || "Update";
  }
}

// ── Review ─────────────────────────────────────────────────────────────────────
const unitHelpful      = ref<boolean | null>(null);
const appHelpful       = ref<boolean | null>(null);
const reviewComment    = ref("");
const submittingReview = ref(false);
const reviewSubmitted  = ref(false);
const reviewStorageKey = computed(() => `bb-reviewed-${ticketNum.value}`);

const canContactUnit = computed(() => {
  const t = ticket.value;
  const s = t?.status;
  if (!t) return false;
  // Setelah selesai/batal, jangan tampilkan hubungi unit sama sekali.
  if (s === "completed" || s === "cancelled") return false;
  return !!(
    unitWhatsappNumber.value ||
    unitPhoneNumber.value ||
    t.unit_whatsapp ||
    t.unit_phone ||
    t.emergency_uuid ||
    (via.value === "whatsapp" && to.value)
  );
});

/** Top CTA for review / PSC / follow-up. WA unit uses contactWaAction below. */
const primaryAction = computed(() => {
  const t = ticket.value;
  if (!t) return null;
  const phase = citizenPhase.value;

  // Selesai: hanya review (kalau belum), atau tidak ada CTA sama sekali.
  if (t.status === "completed") {
    if (!reviewSubmitted.value) {
      return { type: "review" as const, label: "Beri penilaian" };
    }
    return null;
  }
  if (t.status === "cancelled") return null;

  if (phase === "escalated_psc") {
    const hotline = String(t.escalation_hotline || "119").replace(/\D/g, "") || "119";
    return {
      type: "tel" as const,
      href: `tel:${hotline}`,
      label: `Hubungi ${t.escalation_label || "PSC"} · ${t.escalation_hotline || "119"}`,
    };
  }
  if ((phase === "exhausted" || needsFollowUp.value) && !unitWaUrl.value && !waUrl.value) {
    return { type: "tel" as const, href: "tel:119", label: "Hubungi PSC 119" };
  }
  return null;
});

/** Always-visible WA to assigned unit while ticket is active. */
const contactWaAction = computed(() => {
  if (!ticket.value || !canContactUnit.value) return null;
  const href = unitWaUrl.value || waUrl.value;
  if (!href) return null;
  return { href, label: "Hubungi unit via WhatsApp" };
});

onMounted(() => {
  if (localStorage.getItem(reviewStorageKey.value)) reviewSubmitted.value = true;
  slaTimer = setInterval(() => { nowTick.value = Date.now(); }, 1000);
});
onUnmounted(() => {
  if (slaTimer) clearInterval(slaTimer);
  if (pollTimer) clearInterval(pollTimer);
});

async function submitReview() {
  if (!ticket.value || unitHelpful.value === null) return;
  submittingReview.value = true;
  const ticketNumber = String(
    ticket.value.ticket_number || ticketNum.value || ""
  ).trim();
  const emergencyId = String(ticket.value.emergency_uuid || "").trim();
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        ...(emergencyId ? { emergency_id: emergencyId, emergency_uuid: emergencyId } : {}),
        ticket_number: ticketNumber,
        unit_name: ticket.value.unit_name || "",
        unit_helpful: unitHelpful.value,
        app_helpful: appHelpful.value,
        call_type: via.value || "unknown",
        comment: reviewComment.value.trim(),
      },
    });
    localStorage.setItem(reviewStorageKey.value, "1");
    toast.success("Terima kasih atas penilaianmu!");
    reviewSubmitted.value = true;
  } catch (err: unknown) {
    const msg =
      (err as { data?: { message?: string } })?.data?.message ||
      (err as { message?: string })?.message ||
      "Gagal mengirim penilaian";
    toast.error(msg);
  } finally {
    submittingReview.value = false;
  }
}

/** Ticket vs review form — penilaian via CTA only (no second stepper). */
const activeView = ref<"ticket" | "review">("ticket");

// ── Live polling ───────────────────────────────────────────────────────────────
const TERMINAL = new Set(["completed", "cancelled"]);

const hasLiveResponder = computed(() => {
  const t = ticket.value;
  if (!t) return false;
  return !!(t.responder_lat || t.responder_lng);
});

const showLiveMap = computed(() => {
  const t = ticket.value;
  if (!t || !isEnRoute.value) return false;
  return !!(t.requester_lat || t.requester_lng || t.responder_lat || t.unit_lat);
});

/** Map collapsed by default — expand on demand (or auto when live GPS). */
const mapExpanded = ref(false);
watch(
  () => [showLiveMap.value, hasLiveResponder.value] as const,
  ([canShow, live]) => {
    if (!canShow) mapExpanded.value = false;
    else if (live) mapExpanded.value = true;
  },
  { immediate: true },
);

const liveTracking = computed(
  () =>
    hasLiveResponder.value ||
    !!(ticket.value?.track_enabled_at),
);

watch(
  () => [ticket.value?.status, liveTracking.value] as const,
  () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    const status = ticket.value?.status;
    if (import.meta.client && status && !TERMINAL.has(status)) {
      // Live GPS: poll aggressively so citizen map tracks field pings.
      const ms = liveTracking.value ? 2_500 : 8_000;
      pollTimer = setInterval(() => {
        void softRefresh();
      }, ms);
      // Kick once immediately when entering live mode.
      if (liveTracking.value) void softRefresh();
    }
  },
  { immediate: true },
);

const TRACK_STEPS = [
  { key: "diproses", label: "Diproses" },
  { key: "otw", label: "OTW" },
  { key: "penanganan", label: "Penanganan" },
  { key: "selesai", label: "Selesai" },
] as const;

/**
 * 0 Diproses · 1 OTW · 2 Penanganan · 3 Selesai
 * cancelled → muted (−1)
 */
const trackStepIndex = computed(() => {
  const s = ticket.value?.status;
  const phase = citizenPhase.value;
  if (!s || s === "cancelled") return -1;
  if (s === "completed" || phase === "completed") return 3;
  if (phase === "on_scene") return 2;
  if (
    s === "in_progress" ||
    phase === "in_progress" ||
    liveTracking.value
  ) {
    return 1;
  }
  // pending / searching / waiting_unit / accepted / reassigned / exhausted / escalated
  return 0;
});

const trackMuted = computed(() => trackStepIndex.value < 0);

/** Progress bar width across full content (first→last dot). */
const trackProgressWidth = computed(() => {
  const last = TRACK_STEPS.length - 1;
  if (trackMuted.value || trackStepIndex.value < 0) return "0%";
  const idx = Math.min(trackStepIndex.value, last);
  return `${(idx / last) * 100}%`;
});

/** Hex matches urgencyBanner / petugas share-loc tones. */
const trackAccent = computed(() => {
  if (trackMuted.value) return { line: "#d4d4d4" };
  switch (citizenPhase.value) {
    case "accepted":
      return { line: "#d97706" }; // amber-600
    case "in_progress":
      return { line: "#2563eb" }; // blue-600
    case "on_scene":
      return { line: "#7c3aed" }; // violet-600
    case "completed":
      return { line: "#404040" }; // neutral-700
    case "cancelled":
      return { line: "#475569" }; // slate-600
    case "exhausted":
      return { line: "#ea580c" }; // orange-600
    case "escalated_psc":
      return { line: "#7c3aed" }; // violet-600
    case "reassigned":
      return { line: "#334155" }; // slate-700
    default:
      return { line: "#64748b" }; // slate-500 — searching / waiting
  }
});

const fromParty = computed(() => {
  const t = ticket.value;
  if (!t) return { title: "Unit", detail: "—" };
  if (t.unit_name) return { title: "Unit", detail: t.unit_name };
  return { title: "Unit", detail: "Mencari unit…" };
});

const toParty = computed(() => {
  const t = ticket.value;
  if (!t) return { title: "Lokasimu", detail: "—" };
  return {
    title: "Lokasimu",
    detail: t.location || (t.requester_lat ? "Koordinat tersedia" : "Belum ada lokasi"),
  };
});

async function copyTicketNumber() {
  const n = ticket.value?.ticket_number;
  if (!n || !import.meta.client) return;
  try {
    await navigator.clipboard.writeText(n);
    toast.success("Nomor tiket disalin");
  } catch {
    toast.error("Gagal menyalin");
  }
}

const lightboxPhoto = ref<string | null>(null);

// ── Web Push opt-in ────────────────────────────────────────────────────────────
const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = useWebPush(ticketNum);
</script>

<template>
  <div class="w-full space-y-3">

        <!-- Soft skeleton — mirrors card anatomy, initial load only -->
        <div v-if="showSkeleton" class="space-y-3">
          <div class="ui-card overflow-hidden">
            <div class="h-9 w-full soft-skel rounded-none" />
            <div class="px-5 pt-4 pb-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <div class="soft-skel w-10 h-10 rounded-full shrink-0" />
                  <div class="flex-1 space-y-2 pt-0.5">
                    <div class="soft-skel h-4 w-36" />
                    <div class="soft-skel h-3 w-48" />
                  </div>
                </div>
                <div class="space-y-2 shrink-0">
                  <div class="soft-skel h-4 w-24 ml-auto" />
                  <div class="soft-skel h-3 w-14 ml-auto" />
                </div>
              </div>
            </div>
            <div class="px-5 pb-4 space-y-3">
              <div class="soft-skel h-10 w-full rounded-lg" />
              <div class="soft-skel h-8 w-full rounded-lg" />
            </div>
            <div class="px-5 pb-4">
              <div class="soft-skel h-11 w-full rounded-xl" />
            </div>
            <div class="px-5 pb-4 space-y-2">
              <div class="soft-skel h-3 w-full" />
              <div class="soft-skel h-3 w-4/5" />
            </div>
            <div class="px-5 pb-4">
              <div class="soft-skel h-9 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <!-- Not found -->
        <div v-else-if="error || !ticket" class="ui-card p-8 text-center">
          <Icon icon="lucide:file-x" class="text-neutral-300 text-4xl mx-auto mb-3" />
          <p class="font-semibold text-neutral-900">Tiket tidak ditemukan</p>
          <p class="text-sm text-neutral-500 mt-1">Nomor tiket tidak valid atau sudah kedaluwarsa.</p>
          <button
            type="button"
            class="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium"
            @click="goHome"
          >
            <Icon icon="lucide:home" class="text-sm" />
            Kembali ke Aplikasi
          </button>
        </div>

        <!-- Ticket card — tracking layout -->
        <template v-else>
          <div class="ui-card overflow-hidden">

            <!-- Process banner (petugas-style dark strip) -->
            <div
              v-if="urgencyBanner"
              class="px-4 py-2.5 text-center text-sm font-semibold text-white tracking-wide"
              :class="urgencyBanner.tone"
            >
              {{ urgencyBanner.text }}
            </div>

            <template v-if="activeView === 'ticket'">
              <!-- Header: icon | title ↔ ticket# / subtitle ↔ Refresh -->
              <div class="px-5 pt-4 pb-3">
                <div class="flex items-start gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0"
                  >
                    <Icon icon="lucide:ticket" class="text-lg text-neutral-500" />
                  </div>
                  <div
                    class="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 items-baseline"
                  >
                    <h1 class="text-sm font-semibold text-neutral-900 leading-5 truncate">
                      {{ cardTitle }}
                    </h1>
                    <button
                      type="button"
                      class="text-sm font-semibold text-neutral-700 font-mono tracking-wide leading-5 inline-flex items-baseline gap-1 justify-self-end"
                      @click="copyTicketNumber"
                    >
                      {{ ticket.ticket_number }}
                      <Icon icon="lucide:copy" class="text-[10px] text-neutral-400 translate-y-px" />
                    </button>
                    <p
                      v-if="cardSubtitle"
                      class="text-xs text-neutral-500 leading-4 line-clamp-2"
                    >
                      {{ cardSubtitle }}
                    </p>
                    <span v-else aria-hidden="true" />
                    <button
                      type="button"
                      class="inline-flex items-baseline justify-end gap-1 text-xs font-medium leading-4 text-neutral-400 hover:text-neutral-700 justify-self-end"
                      :disabled="isRefreshing"
                      @click="softRefresh()"
                    >
                      <Icon
                        icon="lucide:refresh-cw"
                        :class="['text-xs', isRefreshing && 'animate-spin']"
                      />
                      {{ TERMINAL.has(ticket.status) ? "Refresh" : "Live" }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- FROM → TO (horizontal) -->
              <div class="px-5 pb-4">
                <div class="flex items-start gap-3 sm:gap-4">
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] uppercase tracking-[0.12em] text-neutral-400 font-medium">
                      {{ fromParty.title }}
                    </p>
                    <p class="mt-1 text-sm font-medium text-neutral-800 leading-snug line-clamp-3">
                      {{ fromParty.detail }}
                    </p>
                  </div>
                  <div class="pt-5 shrink-0 text-neutral-300">
                    <Icon icon="lucide:arrow-right" class="text-lg" />
                  </div>
                  <div class="min-w-0 flex-1 text-right">
                    <p class="text-[10px] uppercase tracking-[0.12em] text-neutral-400 font-medium">
                      {{ toParty.title }} 
                    </p>
                    <p class="mt-1 text-sm font-medium text-neutral-800 leading-snug line-clamp-3 truncate">
                      {{ toParty.detail }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Horizontal progress — full content width, shipping-style -->
              <div class="px-5 pb-5" :class="trackMuted && 'opacity-45'">
                <div class="relative w-full">
                  <div
                    class="absolute left-0 right-0 top-[6px] h-[5px] rounded-full bg-neutral-200"
                  />
                  <div
                    class="absolute left-0 top-[6px] h-[5px] rounded-full transition-all duration-300"
                    :style="{
                      width: trackProgressWidth,
                      background: trackMuted ? '#e5e5e5' : trackAccent.line,
                    }"
                  />
                  <div class="relative flex justify-between items-start w-full">
                    <div
                      v-for="(step, i) in TRACK_STEPS"
                      :key="step.key"
                      class="flex flex-col min-w-0"
                      :class="
                        i === 0
                          ? 'items-start'
                          : i === TRACK_STEPS.length - 1
                            ? 'items-end'
                            : 'items-center'
                      "
                    >
                      <div
                        class="w-3.5 h-3.5 rounded-full shrink-0 transition-colors ring-2 ring-white"
                        :style="
                          !trackMuted && trackStepIndex >= i
                            ? {
                                background: trackAccent.line,
                                boxShadow:
                                  trackStepIndex === i
                                    ? `0 0 0 4px ${trackAccent.line}33`
                                    : undefined,
                              }
                            : { background: '#d4d4d4' }
                        "
                      />
                      <p
                        class="mt-2.5 text-[10px] uppercase tracking-[0.06em] leading-tight max-w-[4.5rem]"
                        :class="[
                          i === 0
                            ? 'text-left'
                            : i === TRACK_STEPS.length - 1
                              ? 'text-right'
                              : 'text-center',
                          !trackMuted && trackStepIndex >= i
                            ? 'text-neutral-700 font-semibold'
                            : 'text-neutral-400',
                        ]"
                      >
                        {{ step.label }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Map toggle (collapsed by default) -->
              <div
                v-if="showLiveMap && ticket"
                class="mx-5 mb-4 px-3.5 py-3 rounded-xl bg-neutral-50 flex items-center justify-between gap-3"
              >
                <div class="min-w-0 flex items-center gap-2">
                  <Icon icon="lucide:map-pin" class="text-base text-neutral-400 shrink-0" />
                  <div class="min-w-0">
                    <p class="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">
                      Live Location
                    </p>
                    <p class="text-xs text-neutral-600 leading-snug">
                      {{ hasLiveResponder ? "Live location petugas" : "Lokasi permintaan" }}
                    </p>
                  </div>
                </div>
                <button
                  v-if="!mapExpanded"
                  type="button"
                  class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 shadow-sm hover:bg-neutral-50"
                  @click="mapExpanded = true"
                >
                  <Icon icon="lucide:map" class="text-sm text-neutral-500" />
                  Buka
                  <span
                    v-if="hasLiveResponder"
                    class="w-1.5 h-1.5 rounded-full animate-pulse"
                    :style="{ background: trackAccent.line }"
                  />
                </button>
                <button
                  v-else
                  type="button"
                  class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200 shadow-sm"
                  @click="mapExpanded = false"
                >
                  Tutup
                </button>
              </div>

              <!-- Expanded map -->
              <div v-if="showLiveMap && ticket && mapExpanded" class="px-5 pb-4">
                <div class="rounded-xl overflow-hidden ring-1 ring-neutral-100">
                  <TicketLiveMap
                    :requester-lat="ticket.requester_lat"
                    :requester-lng="ticket.requester_lng"
                    :responder-lat="ticket.responder_lat"
                    :responder-lng="ticket.responder_lng"
                    :unit-lat="ticket.unit_lat"
                    :unit-lng="ticket.unit_lng"
                    :updated-at="ticket.responder_updated_at"
                    :on-scene="citizenPhase === 'on_scene'"
                  />
                </div>
              </div>

              <!-- Primary CTA -->
              <div
                v-if="contactWaAction || primaryAction || (ticket.status === 'pending' && !needsFollowUp)"
                class="px-5 pb-4 space-y-2"
              >
                <a
                  v-if="contactWaAction"
                  :href="contactWaAction.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:scale-[0.98] transition-all"
                >
                  <Icon icon="mdi:whatsapp" class="text-lg" />
                  {{ contactWaAction.label }}
                </a>
                <a
                  v-if="primaryAction?.type === 'tel'"
                  :href="primaryAction.href"
                  class="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm bg-neutral-900 active:scale-[0.98] transition-all"
                >
                  <Icon icon="lucide:phone" class="text-lg" />
                  {{ primaryAction.label }}
                </a>
                <button
                  v-else-if="primaryAction?.type === 'review'"
                  type="button"
                  class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-sm"
                  @click="activeView = 'review'"
                >
                  <Icon icon="lucide:star" class="text-lg" />
                  {{ primaryAction.label }}
                </button>
                <p
                  v-else-if="!contactWaAction && ticket.status === 'pending' && !needsFollowUp"
                  class="text-center text-sm text-neutral-500 py-1 leading-snug"
                >
                  Mohon tunggu — kami sedang menghubungkan Anda ke unit.
                </p>
                <div
                  v-if="needsFollowUp && !contactWaAction && primaryAction?.type !== 'tel'"
                  class="text-center"
                >
                  <a href="tel:119" class="text-sm font-semibold text-red-600 underline-offset-2 hover:underline">
                    Atau hubungi PSC 119
                  </a>
                </div>
              </div>

              <!-- Compact details -->
              <div
                v-if="previewRows.length && !showDetails"
                class="border-t border-dashed border-neutral-200 px-5 py-3 space-y-3"
              >
                <div
                  v-for="row in previewRows"
                  :key="row.key"
                  class="min-w-0"
                >
                  <p class="text-sm font-semibold text-neutral-900 truncate">{{ row.title }}</p>
                  <p class="text-sm text-neutral-500 mt-0.5 line-clamp-2 leading-snug">{{ row.detail }}</p>
                </div>
              </div>

              <div v-if="showDetails" class="border-t border-dashed border-neutral-200 divide-y divide-neutral-100 text-sm">
                <div class="px-5 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-neutral-500 text-xs">Pelapor</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_name }}</p>
                  </div>
                  <div>
                    <p class="text-neutral-500 text-xs">No. HP</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_phone }}</p>
                  </div>
                </div>

                <div v-if="ticket.location || ticket.condition" class="px-5 py-3 space-y-2">
                  <div v-if="ticket.location" class="flex items-start gap-2 text-neutral-700">
                    <Icon icon="lucide:map-pin" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                    <span class="leading-snug">{{ ticket.location }}</span>
                  </div>
                  <div v-if="ticket.condition" class="flex items-start gap-2 text-neutral-700">
                    <Icon icon="lucide:activity" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                    <span class="leading-snug">{{ ticket.condition }}</span>
                  </div>
                </div>

                <div v-if="ticket.photo_url" class="px-5 py-3">
                  <button
                    class="inline-flex items-center gap-1.5 font-medium text-primary-600 px-3 py-2 rounded-lg bg-primary-50 text-sm"
                    @click="lightboxPhoto = assetUrl(ticket.photo_url)"
                  >
                    <Icon icon="lucide:camera" class="text-base" />
                    Lihat Foto
                  </button>
                </div>

                <div v-if="ticket.handler_name || ticket.handling_notes" class="px-5 py-3 bg-emerald-50/60">
                  <p class="text-xs font-semibold text-emerald-700 mb-1.5">Penanganan</p>
                  <p v-if="ticket.handler_name" class="text-neutral-800">
                    <span class="text-emerald-700">Petugas:</span> {{ ticket.handler_name }}
                  </p>
                  <p v-if="ticket.handling_notes" class="text-neutral-800 mt-1">
                    <span class="text-emerald-700">Catatan:</span> {{ ticket.handling_notes }}
                  </p>
                </div>

                <div v-if="historyItems.length" class="px-5 py-3">
                  <p class="text-xs font-semibold text-neutral-500 mb-2">Riwayat</p>
                  <ul class="space-y-1.5">
                    <li
                      v-for="(ev, idx) in visibleHistory"
                      :key="ev.id || `${ev.type}-${ev.created_at}-${idx}`"
                      class="flex items-baseline gap-2 text-sm leading-snug"
                    >
                      <span class="text-neutral-400 tabular-nums shrink-0 w-11">{{ historyTime(ev.created_at) }}</span>
                      <span class="text-neutral-700 min-w-0">{{ historyShort(ev) }}</span>
                    </li>
                  </ul>
                  <button
                    v-if="hiddenHistoryCount > 0"
                    type="button"
                    class="mt-1.5 text-sm font-medium text-neutral-500"
                    @click="historyExpanded = !historyExpanded"
                  >
                    {{ historyExpanded ? "Sembunyikan" : `+${hiddenHistoryCount} sebelumnya` }}
                  </button>
                </div>
              </div>

              <div class="px-5 pb-4 pt-1">
                <button
                  type="button"
                  class="w-full py-2 rounded-xl bg-neutral-50 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  @click="showDetails = !showDetails"
                >
                  {{
                    showDetails
                      ? "Sembunyikan detail"
                      : moreDetailCount > 0
                        ? `+${moreDetailCount} detail lagi`
                        : "Lihat detail"
                  }}
                </button>
              </div>
            </template>

            <!-- ── VIEW: Review ── -->
            <template v-else>
              <div v-if="reviewSubmitted" class="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
                <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <Icon icon="lucide:check-circle" class="text-green-500 text-2xl" />
                </div>
                <p class="font-semibold text-neutral-800 text-base">Terima kasih!</p>
                <p class="text-sm text-neutral-500">Penilaianmu membantu kami berkembang.</p>
                <button class="text-sm text-primary-600 font-medium mt-1" @click="activeView = 'ticket'">
                  Lihat detail tiket
                </button>
              </div>

              <div v-else class="px-4 py-4 space-y-4">
                <div>
                  <p class="text-base font-semibold text-neutral-900">Beri Penilaian</p>
                  <p class="text-sm text-neutral-500 mt-0.5">Bantu kami berkembang dengan penilaianmu.</p>
                </div>

                <div>
                  <p class="text-sm font-medium text-neutral-700 mb-2">
                    Apakah <span class="font-semibold">{{ ticket.unit_name || 'unit ini' }}</span> membantu?
                  </p>
                  <div class="flex gap-2">
                    <button :class="['flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all', unitHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600']" @click="unitHelpful = true">
                      <Icon icon="lucide:thumbs-up" /> Ya
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all', unitHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600']" @click="unitHelpful = false">
                      <Icon icon="lucide:thumbs-down" /> Tidak
                    </button>
                  </div>
                </div>

                <div>
                  <p class="text-sm font-medium text-neutral-700 mb-2">Apakah aplikasi ini berguna?</p>
                  <div class="flex gap-2">
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all', appHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = true">
                      <Icon icon="lucide:smile" /> Ya
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all', appHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = false">
                      <Icon icon="lucide:frown" /> Tidak
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all', appHelpful === null ? 'border-neutral-300 bg-neutral-50 text-neutral-500' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = null">
                      <Icon icon="lucide:meh" /> Biasa
                    </button>
                  </div>
                </div>

                <div>
                  <textarea
                    v-model="reviewComment"
                    rows="2"
                    maxlength="500"
                    placeholder="Komentar (opsional)..."
                    class="ui-field resize-none"
                  />
                </div>

                <button
                  :disabled="unitHelpful === null || submittingReview"
                  class="w-full py-3.5 rounded-lg bg-red-600 text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  @click="submitReview"
                >
                  <Icon v-if="submittingReview" icon="lucide:loader-2" class="animate-spin text-base" />
                  <template v-else>
                    <Icon icon="lucide:send" class="text-sm" />
                    Kirim Penilaian
                  </template>
                </button>

                <button class="w-full text-sm text-neutral-500 py-1" @click="activeView = 'ticket'">
                  Kembali ke detail tiket
                </button>
              </div>
            </template>
          </div>

          <div v-if="pushSupported && !TERMINAL.has(ticket.status)" class="px-1">
            <button
              v-if="!pushSubscribed"
              type="button"
              :disabled="pushLoading"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 disabled:opacity-50"
              @click="pushSubscribe"
            >
              <Icon
                :icon="pushLoading ? 'lucide:loader-2' : 'lucide:bell'"
                :class="['text-sm', pushLoading && 'animate-spin']"
              />
              {{ pushLoading ? "Mengaktifkan…" : "Aktifkan notifikasi" }}
            </button>
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-600"
              @click="pushUnsubscribe"
            >
              <Icon icon="lucide:bell-off" class="text-sm" />
              Matikan notifikasi
            </button>
          </div>

          <p class="text-center text-xs text-neutral-400">
            ButuhBantuan &copy; {{ new Date().getFullYear() }}
          </p>
        </template>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightboxPhoto"
          class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          @click="lightboxPhoto = null"
        >
          <div class="max-w-full max-h-[85vh]" @click.stop>
            <SkeletonImage
              :src="lightboxPhoto"
              alt="Foto"
              wrapper-class="max-w-full max-h-[85vh] rounded-xl min-w-[200px] min-h-[160px]"
              img-class="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
          </div>
          <button
            class="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
            @click="lightboxPhoto = null"
          >
            <Icon icon="ion:close" class="text-white text-xl" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
