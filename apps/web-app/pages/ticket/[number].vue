<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";
import { appToast } from "~/utils/appToast";
import { closeAllSheets } from "~/utils/closeAllSheets";

import {
  CITIZEN_PHASE_HINT,
  CITIZEN_PHASE_LABEL,
  resolveCitizenPhase,
} from "~/utils/citizenPhase";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const toast = appToast();

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiBase + url;
}

/** Leave e-ticket → clean home (no leftover sheets / query / history stack). */
async function goHome() {
  toast.dismiss();
  closeAllSheets();
  await navigateTo({ path: "/", query: {} }, { replace: true });
}

onBeforeUnmount(() => {
  toast.dismiss();
  closeAllSheets();
});

const { data, pending, error, refresh } = await useAsyncData(`ticket-${route.params.number}`, () =>
  $fetch<{ data: any }>(`${config.public.apiBaseUrl}/api/v1/order/ticket/${route.params.number}`)
    .catch(() => null)
);

const ticket = computed(() => data.value?.data ?? null);
/** Only block UI on first load — polling refresh must not swap to skeleton. */
const showSkeleton = computed(() => pending.value && !ticket.value);
const isRefreshing = ref(false);

async function softRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await refresh();
  } finally {
    isRefreshing.value = false;
  }
}

const citizenPhase = computed(() => resolveCitizenPhase(ticket.value));
const phaseLabel = computed(() => CITIZEN_PHASE_LABEL[citizenPhase.value] ?? "Menunggu");
const phaseHint = computed(() => CITIZEN_PHASE_HINT[citizenPhase.value] ?? "");

const PHASE_COLOR: Record<string, string> = {
  searching: "bg-amber-50 text-amber-800 border-amber-200",
  waiting_unit: "bg-amber-50 text-amber-800 border-amber-200",
  reassigned: "bg-blue-50 text-blue-800 border-blue-200",
  exhausted: "bg-orange-50 text-orange-800 border-orange-200",
  escalated_psc: "bg-violet-50 text-violet-800 border-violet-200",
  on_scene: "bg-emerald-50 text-emerald-800 border-emerald-200",
  accepted: "bg-blue-50 text-blue-800 border-blue-200",
  in_progress: "bg-orange-50 text-orange-800 border-orange-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-neutral-50 text-neutral-700 border-neutral-200",
};

/** Thin urgency strip — only for phases that need attention. */
const urgencyBanner = computed(() => {
  switch (citizenPhase.value) {
    case "exhausted":
      return { text: "Belum ada unit merespons — hubungi manual", tone: "bg-orange-600" };
    case "escalated_psc":
      return { text: "Dieskalasi ke pusat darurat (PSC)", tone: "bg-violet-600" };
    case "cancelled":
      return { text: "Tiket dibatalkan", tone: "bg-neutral-700" };
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

const cardSubtitle = computed(() => phaseHint.value);

const createdMeta = computed(() => {
  const raw = ticket.value?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Dibuat hari ini";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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

// Contact info from query params
const via = computed(() => (route.query.via as string) || "");
const to  = computed(() => (route.query.to  as string) || "");

function buildWAMessage(t: any) {
  const mapsLink = t.requester_lat && t.requester_lng
    ? `https://www.google.com/maps?q=${t.requester_lat},${t.requester_lng}`
    : null;
  return [
    `Halo *${t.unit_name}*, saya membutuhkan bantuan darurat.`,
    ``,
    `📋 *No. Tiket:* ${t.ticket_number}`,
    `👤 *Nama:* ${t.requester_name}`,
    `📞 *No. HP:* ${t.requester_phone}`,
    mapsLink ? `📍 *Lokasi (Maps):* ${mapsLink}` : null,
    t.location  ? `🗺️ *Alamat:* ${t.location}`  : null,
    t.condition ? `🚨 *Kondisi:* ${t.condition}` : null,
    ``,
    `Mohon segera dibantu. Terima kasih.`,
  ].filter(Boolean).join("\n");
}

const waUrl = computed(() => {
  if (!ticket.value || via.value !== "whatsapp" || !to.value) return "";
  return `https://wa.me/${to.value}?text=${encodeURIComponent(buildWAMessage(ticket.value))}`;
});
const phoneUrl = computed(() => {
  if (via.value !== "phone" || !to.value) return "";
  return `tel:${to.value}`;
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
  const digits = convertPhoneNumber(unitWhatsappNumber.value);
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(buildWAMessage(t))}`;
});

const unitTelUrl = computed(() => {
  if (!unitPhoneNumber.value) return "";
  return `tel:${unitPhoneNumber.value}`;
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
      return "Petugas sudah sampai";
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
const reviewStorageKey = computed(() => `bb-reviewed-${route.params.number}`);

const canContactUnit = computed(() => {
  const s = ticket.value?.status;
  if (!ticket.value?.emergency_uuid) return false;
  // Setelah selesai/batal, jangan tampilkan hubungi unit sama sekali.
  if (s === "completed" || s === "cancelled") return false;
  return true;
});

/** Top CTA — keep calm; WA unit goes to bottom while en-route. */
const primaryAction = computed(() => {
  const t = ticket.value;
  if (!t) return null;
  const phase = citizenPhase.value;
  const terminal = t.status === "completed" || t.status === "cancelled";

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
  if (phase === "exhausted" || needsFollowUp.value) {
    if (unitWaUrl.value) {
      return { type: "wa" as const, href: unitWaUrl.value, label: "Hubungi unit via WhatsApp" };
    }
    return { type: "tel" as const, href: "tel:119", label: "Hubungi PSC 119" };
  }
  // En-route / on scene: map is the hero — don't put WA on top.
  if (isEnRoute.value || phase === "on_scene") return null;
  if (canContactUnit.value && (unitWaUrl.value || unitTelUrl.value)) {
    if (unitWaUrl.value) {
      return { type: "wa" as const, href: unitWaUrl.value, label: "Hubungi unit via WhatsApp" };
    }
    if (unitTelUrl.value) {
      return { type: "tel" as const, href: unitTelUrl.value, label: "Telepon unit" };
    }
  }
  // Query-param deep links — never after terminal states.
  if (!terminal && waUrl.value) {
    return { type: "wa" as const, href: waUrl.value, label: "Hubungi via WhatsApp" };
  }
  if (!terminal && phoneUrl.value) {
    return { type: "tel" as const, href: phoneUrl.value, label: "Hubungi via Telepon" };
  }
  return null;
});

const bottomWaAction = computed(() => {
  if (!ticket.value || !isEnRoute.value || !unitWaUrl.value) return null;
  if (!canContactUnit.value) return null;
  return { href: unitWaUrl.value, label: "Hubungi unit via WhatsApp" };
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
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        emergency_id:  ticket.value.emergency_uuid,
        unit_name:     ticket.value.unit_name,
        unit_helpful:  unitHelpful.value,
        app_helpful:   appHelpful.value,
        call_type:     via.value || "unknown",
        comment:       reviewComment.value.trim(),
      },
    });
    localStorage.setItem(reviewStorageKey.value, "1");
    toast.success("Terima kasih atas penilaianmu!");
    reviewSubmitted.value = true;
  } catch {
    toast.error("Gagal mengirim penilaian");
  } finally {
    submittingReview.value = false;
  }
}

// ── Stepper ────────────────────────────────────────────────────────────────────
const BASE_STEPS = [
  { key: "pending",     label: "Menunggu", icon: "lucide:clock" },
  { key: "accepted",    label: "Diterima", icon: "lucide:check" },
  { key: "in_progress", label: "Diproses", icon: "lucide:activity" },
  { key: "completed",   label: "Selesai",  icon: "lucide:check-circle" },
];
const REVIEW_STEP = { key: "review", label: "Penilaian", icon: "lucide:star" };
const STEP_ORDER  = BASE_STEPS.map(s => s.key);

const steps = computed(() =>
  ticket.value?.status === "completed" ? [...BASE_STEPS, REVIEW_STEP] : BASE_STEPS
);

// Active view when status is completed
const activeView = ref<"ticket" | "review">("ticket");

function stepCircleClass(key: string): string {
  const cur = ticket.value?.status;
  if (key === "review") {
    if (reviewSubmitted.value) return "bg-green-500";
    if (activeView.value === "review") return "bg-primary-600";
    return "bg-neutral-200";
  }
  if (cur === "completed") return "bg-green-500";
  if (!cur || cur === "cancelled") return "bg-neutral-200";
  const ci = STEP_ORDER.indexOf(cur), ki = STEP_ORDER.indexOf(key);
  if (ci > ki) return "bg-green-500";
  if (ci === ki) return "bg-yellow-400";
  return "bg-neutral-200";
}

function stepRing(key: string): string {
  if (ticket.value?.status !== "completed") return "";
  if (key === "completed" && activeView.value === "ticket")
    return "ring-2 ring-offset-1 ring-green-400";
  if (key === "review" && activeView.value === "review")
    return reviewSubmitted.value
      ? "ring-2 ring-offset-1 ring-green-400"
      : "ring-2 ring-offset-1 ring-primary-400";
  return "";
}

function stepConnectorClass(key: string): string {
  if (key === "completed") return reviewSubmitted.value ? "bg-green-400" : "bg-neutral-200";
  const cur = ticket.value?.status;
  if (!cur || cur === "cancelled") return "bg-neutral-200";
  const ci = STEP_ORDER.indexOf(cur), ki = STEP_ORDER.indexOf(key);
  return ci > ki ? "bg-green-400" : "bg-neutral-200";
}

function stepLabelClass(key: string): string {
  const cur = ticket.value?.status;
  if (key === "review") {
    const active = activeView.value === "review" || reviewSubmitted.value;
    return active ? "text-neutral-700 font-semibold" : "text-neutral-400";
  }
  if (cur === "completed") {
    return key === "completed" && activeView.value === "ticket"
      ? "text-neutral-700 font-semibold"
      : "text-neutral-700 font-medium";
  }
  if (!cur || cur === "cancelled") return "text-neutral-400";
  const ci = STEP_ORDER.indexOf(cur), ki = STEP_ORDER.indexOf(key);
  return ci >= ki ? "text-neutral-700 font-medium" : "text-neutral-400";
}

function isClickable(key: string): boolean {
  return ticket.value?.status === "completed" && (key === "completed" || key === "review");
}

function onStepClick(key: string): void {
  if (!isClickable(key)) return;
  activeView.value = key === "review" ? "review" : "ticket";
}

// ── Status labels / colors ─────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:     "Menunggu",
  accepted:    "Diterima",
  in_progress: "Sedang Diproses",
  completed:   "Selesai",
  cancelled:   "Dibatalkan",
};
const STATUS_COLOR: Record<string, string> = {
  pending:     "bg-amber-50 text-amber-800 border-amber-200",
  accepted:    "bg-blue-50 text-blue-800 border-blue-200",
  in_progress: "bg-orange-50 text-orange-800 border-orange-200",
  completed:   "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled:   "bg-neutral-50 text-neutral-700 border-neutral-200",
};

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

watch(
  () => [ticket.value?.status, hasLiveResponder.value, ticket.value?.track_enabled_at],
  () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    const status = ticket.value?.status;
    if (import.meta.client && status && !TERMINAL.has(status)) {
      const ms = hasLiveResponder.value || ticket.value?.track_enabled_at ? 5_000 : 10_000;
      pollTimer = setInterval(() => softRefresh(), ms);
    }
  },
  { immediate: true }
);
// pollTimer cleanup is handled in the shared onUnmounted above

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const lightboxPhoto = ref<string | null>(null);

// ── Web Push opt-in ────────────────────────────────────────────────────────────
const ticketNum = computed(() => String(route.params.number));
const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = useWebPush(ticketNum);
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Top bar -->
    <div class="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3.5 flex items-center gap-3">
      <button class="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" @click="goHome">
        <Icon icon="lucide:arrow-left" class="text-neutral-700 text-lg" />
      </button>
      <span class="text-base font-semibold text-neutral-900">E-Tiket Darurat</span>
    </div>

    <div class="flex flex-col items-center py-4 px-4">
      <div class="w-full max-w-sm space-y-3">

        <!-- Soft skeleton — mirrors card anatomy, initial load only -->
        <div v-if="showSkeleton" class="space-y-3">
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 space-y-2 pt-0.5">
                  <div class="soft-skel h-4 w-40" />
                  <div class="soft-skel h-3 w-52" />
                </div>
                <div class="space-y-2 shrink-0">
                  <div class="soft-skel h-4 w-24 ml-auto" />
                  <div class="soft-skel h-3 w-12 ml-auto" />
                </div>
              </div>
              <div class="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-neutral-200/80 space-y-2">
                <div class="soft-skel h-6 w-28 rounded-full" />
                <div class="soft-skel h-3 w-44" />
              </div>
            </div>
            <div class="px-4 py-3 border-t border-dashed border-neutral-200 space-y-2">
              <div class="soft-skel h-11 w-full rounded-lg" />
              <div class="soft-skel h-11 w-full rounded-lg" />
            </div>
            <div class="px-4 py-3 border-t border-dashed border-neutral-200">
              <div class="soft-skel h-44 w-full rounded-lg" />
            </div>
            <div class="px-4 py-3 border-t border-dashed border-neutral-200 space-y-2">
              <div class="soft-skel h-3 w-20" />
              <div class="soft-skel h-3 w-full" />
              <div class="soft-skel h-3 w-4/5" />
              <div class="soft-skel h-3 w-2/3" />
            </div>
            <div class="px-4 pb-3 pt-1">
              <div class="soft-skel h-9 w-full rounded-lg" />
            </div>
          </div>
          <div class="bg-white rounded-xl border border-neutral-200 p-4">
            <div class="flex gap-3">
              <div class="soft-skel w-8 h-8 rounded-full shrink-0" />
              <div class="flex-1 space-y-2 pt-1">
                <div class="soft-skel h-3 w-28" />
                <div class="soft-skel h-3 w-full" />
                <div class="soft-skel h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        <!-- Not found -->
        <div v-else-if="error || !ticket" class="bg-white rounded-xl border border-neutral-200 p-8 text-center">
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

        <!-- Ticket card — Untitled order-card anatomy -->
        <template v-else>
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">

            <!-- Urgency strip (optional) -->
            <div
              v-if="urgencyBanner"
              class="px-4 py-2 text-center text-sm font-medium text-white"
              :class="urgencyBanner.tone"
            >
              {{ urgencyBanner.text }}
            </div>

            <!-- Card header -->
            <div class="px-4 pt-4 pb-3 bg-neutral-50 border-b border-neutral-100">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h1 class="text-base font-semibold text-neutral-900 leading-snug truncate">
                    {{ cardTitle }}
                  </h1>
                  <p class="mt-0.5 text-sm text-neutral-500 leading-snug line-clamp-2">
                    {{ cardSubtitle }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm font-semibold text-neutral-900 font-mono tracking-wide">
                    {{ ticket.ticket_number }}
                  </p>
                  <p
                    v-if="etaLabel && isEnRoute && citizenPhase !== 'on_scene'"
                    class="mt-0.5 text-xs font-medium text-neutral-500"
                  >
                    ETA {{ etaLabel }}
                  </p>
                  <button
                    type="button"
                    class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-700"
                    :disabled="isRefreshing"
                    @click="softRefresh()"
                  >
                    <Icon
                      icon="lucide:refresh-cw"
                      :class="['text-xs', isRefreshing && 'animate-spin']"
                    />
                    {{ TERMINAL.has(ticket.status) ? 'Refresh' : 'Live' }}
                  </button>
                </div>
              </div>

              <div class="mt-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-neutral-200/80">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border',
                      PHASE_COLOR[citizenPhase] ?? 'bg-neutral-50 text-neutral-700 border-neutral-200',
                    ]"
                  >
                    {{ phaseLabel }}
                  </span>
                </div>
                <div class="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                  <span v-if="createdMeta" class="inline-flex items-center gap-1.5 min-w-0">
                    <Icon icon="lucide:calendar" class="text-sm shrink-0 text-neutral-400" />
                    <span class="truncate">{{ createdMeta }}</span>
                  </span>
                  <span
                    v-if="createdMeta && historyItems.length"
                    class="w-px h-3 bg-neutral-200 shrink-0"
                  />
                  <span
                    v-if="historyItems.length"
                    class="inline-flex items-center gap-1.5 ml-auto shrink-0"
                  >
                    <Icon icon="lucide:file-text" class="text-sm text-neutral-400" />
                    {{ historyItems.length }}
                  </span>
                </div>
              </div>
            </div>

            <!-- One primary CTA (hidden while en-route — WA moved below) -->
            <div
              v-if="primaryAction || (ticket.status === 'pending' && !needsFollowUp)"
              class="px-4 py-3 border-t border-dashed border-neutral-200"
            >
              <a
                v-if="primaryAction && (primaryAction.type === 'wa' || primaryAction.type === 'tel')"
                :href="primaryAction.href"
                :target="primaryAction.type === 'wa' ? '_blank' : undefined"
                :rel="primaryAction.type === 'wa' ? 'noopener noreferrer' : undefined"
                class="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-semibold text-sm active:scale-[0.98] transition-all"
                :class="primaryAction.type === 'wa' ? 'bg-green-600' : 'bg-neutral-900'"
              >
                <Icon :icon="primaryAction.type === 'wa' ? 'mdi:whatsapp' : 'lucide:phone'" class="text-lg" />
                {{ primaryAction.label }}
              </a>
              <button
                v-else-if="primaryAction?.type === 'review'"
                type="button"
                class="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-red-600 text-white font-semibold text-sm"
                @click="activeView = 'review'"
              >
                <Icon icon="lucide:star" class="text-lg" />
                {{ primaryAction.label }}
              </button>
              <p
                v-else-if="ticket.status === 'pending' && !needsFollowUp"
                class="text-center text-sm text-neutral-500 py-1 leading-snug"
              >
                Mohon tunggu — kami sedang menghubungkan Anda ke unit.
              </p>
              <div
                v-if="needsFollowUp && primaryAction?.type !== 'tel'"
                class="mt-2 text-center"
              >
                <a href="tel:119" class="text-sm font-semibold text-red-600 underline-offset-2 hover:underline">
                  Atau hubungi PSC 119
                </a>
              </div>
            </div>

            <TicketLiveMap
              v-if="showLiveMap && ticket"
              :requester-lat="ticket.requester_lat"
              :requester-lng="ticket.requester_lng"
              :responder-lat="ticket.responder_lat"
              :responder-lng="ticket.responder_lng"
              :unit-lat="ticket.unit_lat"
              :unit-lng="ticket.unit_lng"
              :updated-at="ticket.responder_updated_at"
            />

            <!-- Completed: compact stepper for review toggle only -->
            <div v-if="ticket.status === 'completed'" class="px-5 sm:px-6 pt-4 pb-3 border-t border-dashed border-neutral-200">
              <div class="flex items-start justify-center gap-1.5">
                <template v-for="(step, i) in steps" :key="step.key">
                  <component
                    :is="isClickable(step.key) ? 'button' : 'div'"
                    :type="isClickable(step.key) ? 'button' : undefined"
                    class="flex flex-col items-center flex-none"
                    :class="isClickable(step.key) ? 'cursor-pointer active:opacity-60' : 'cursor-default'"
                    style="width: 44px"
                    @click="onStepClick(step.key)"
                  >
                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center transition-all', stepCircleClass(step.key), stepRing(step.key)]">
                      <Icon :icon="step.icon" class="text-white text-[11px]" />
                    </div>
                    <p :class="['text-[10px] mt-1.5 text-center leading-tight', stepLabelClass(step.key)]">
                      {{ step.label }}
                    </p>
                  </component>
                  <div v-if="i < steps.length - 1" :class="['flex-1 h-0.5 mt-3.5 max-w-[20px]', stepConnectorClass(step.key)]" />
                </template>
              </div>
            </div>

            <!-- ── VIEW: Ticket details (collapsed by default) ── -->
            <template v-if="activeView === 'ticket'">
              <!-- Preview rows -->
              <div
                v-if="previewRows.length && !showDetails"
                class="border-t border-dashed border-neutral-200 px-4 py-3 space-y-3"
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
                <div class="px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-neutral-500 text-xs">Pelapor</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_name }}</p>
                  </div>
                  <div>
                    <p class="text-neutral-500 text-xs">No. HP</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_phone }}</p>
                  </div>
                </div>

                <div v-if="ticket.location || ticket.condition" class="px-4 py-3 space-y-2">
                  <div v-if="ticket.location" class="flex items-start gap-2 text-neutral-700">
                    <Icon icon="lucide:map-pin" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                    <span class="leading-snug">{{ ticket.location }}</span>
                  </div>
                  <div v-if="ticket.condition" class="flex items-start gap-2 text-neutral-700">
                    <Icon icon="lucide:activity" class="shrink-0 mt-0.5 text-neutral-400 text-base" />
                    <span class="leading-snug">{{ ticket.condition }}</span>
                  </div>
                </div>

                <div v-if="ticket.photo_url" class="px-4 py-3">
                  <button
                    class="inline-flex items-center gap-1.5 font-medium text-primary-600 px-3 py-2 rounded-lg bg-primary-50 text-sm"
                    @click="lightboxPhoto = assetUrl(ticket.photo_url)"
                  >
                    <Icon icon="lucide:camera" class="text-base" />
                    Lihat Foto
                  </button>
                </div>

                <div v-if="ticket.handler_name || ticket.handling_notes" class="px-4 py-3 bg-emerald-50/60">
                  <p class="text-xs font-semibold text-emerald-700 mb-1.5">Penanganan</p>
                  <p v-if="ticket.handler_name" class="text-neutral-800">
                    <span class="text-emerald-700">Petugas:</span> {{ ticket.handler_name }}
                  </p>
                  <p v-if="ticket.handling_notes" class="text-neutral-800 mt-1">
                    <span class="text-emerald-700">Catatan:</span> {{ ticket.handling_notes }}
                  </p>
                </div>

                <div v-if="historyItems.length" class="px-4 py-3">
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

              <div class="px-4 pb-3 pt-1">
                <button
                  type="button"
                  class="w-full py-2 rounded-lg bg-neutral-50 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
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
              <!-- Success -->
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

              <!-- Form -->
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
                    class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-none transition-colors"
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

          <!-- En-route: WA unit di bawah peta/detail -->
          <a
            v-if="bottomWaAction"
            :href="bottomWaAction.href"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-green-600 text-white font-semibold text-base border border-transparent active:scale-[0.98] transition-all"
          >
            <Icon icon="mdi:whatsapp" class="text-xl" />
            {{ bottomWaAction.label }}
          </a>

          <!-- Push notification opt-in (only while ticket is active) -->
          <div v-if="pushSupported && !TERMINAL.has(ticket.status)">
            <button
              v-if="!pushSubscribed"
              :disabled="pushLoading"
              class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-neutral-800 text-base font-medium border border-neutral-200 active:scale-95 transition-all disabled:opacity-50"
              @click="pushSubscribe"
            >
              <Icon v-if="pushLoading" icon="lucide:loader-2" class="animate-spin text-base" />
              <Icon v-else icon="lucide:bell" class="text-base" />
              {{ pushLoading ? 'Mengaktifkan...' : 'Aktifkan notifikasi update' }}
            </button>
            <button
              v-else
              class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-500 text-sm"
              @click="pushUnsubscribe"
            >
              <Icon icon="lucide:bell-off" class="text-sm" />
              Nonaktifkan notifikasi
            </button>
          </div>

          <p class="text-center text-xs text-neutral-400">
            ButuhBantuan &copy; {{ new Date().getFullYear() }}
          </p>
        </template>
      </div>
    </div>

    <!-- Photo lightbox -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightboxPhoto"
          class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          @click="lightboxPhoto = null"
        >
          <img :src="lightboxPhoto" class="max-w-full max-h-[85vh] rounded-xl object-contain" @click.stop />
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
