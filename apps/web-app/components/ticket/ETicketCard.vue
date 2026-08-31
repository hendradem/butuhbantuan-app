<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { jenisPelayananLabel, assessmentAnswerLabel, triageAnswersFrom, inferAssessmentCategory, assessmentSectionMeta } from "@butuhbantuan/utils";
import { buildUnitWaMessage, dispatchJobUrl, waDeepLink } from "~/utils/waContact";
import { loadUnitJobLink, markWaFollowupSent, saveUnitJobLink, wasWaFollowupSent } from "~/utils/unitJobLink";

import {
  CITIZEN_PHASE_HINT,
  citizenTrackStepIndex,
  resolveCitizenPhase,
} from "~/utils/citizenPhase";

import { loadTicketAccessPhone, saveTicketAccess } from "~/utils/ticketAccess";
import { ticketViewUrl } from "~/utils/ticketUrl";

const props = withDefaults(
  defineProps<{
    viewToken: string;
    via?: string;
    to?: string;
  }>(),
  { via: "", to: "" },
);

const emit = defineEmits<{
  close: [];
  meta: [{ status: string; unitName: string }];
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const toast = appToast();

const viewToken = computed(() => String(props.viewToken || "").trim());
const via = computed(() => String(props.via || "").trim());
const to = computed(() => String(props.to || "").trim());

function claimPhoneForFetch(): string {
  const fromProfile = phone.value?.trim();
  if (fromProfile) return fromProfile;
  return loadTicketAccessPhone(viewToken.value);
}

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

const { phone, load: loadProfile, save: saveProfile } = useRequesterProfile();
loadProfile();

async function fetchTicket(bustCache = false) {
  const token = viewToken.value;
  if (!token) return null;

  const qs = new URLSearchParams();
  const p = claimPhoneForFetch();
  if (p) qs.set("phone", p);
  if (bustCache) qs.set("_", String(Date.now()));
  const q = qs.toString();
  const url = `${config.public.apiBaseUrl}/api/v1/order/view/${encodeURIComponent(token)}${q ? `?${q}` : ""}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: any };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

const ticket = ref<any>(null);
const pending = ref(true);
const error = ref<Error | null>(null);
const loadAttempted = ref(false);

async function loadTicket(bustCache = false) {
  const token = viewToken.value;
  if (!token) {
    pending.value = false;
    loadAttempted.value = true;
    return null;
  }
  if (!ticket.value) pending.value = true;
  error.value = null;
  try {
    const data = await fetchTicket(bustCache);
    if (data) ticket.value = data;
    return data;
  } catch (e) {
    error.value = e instanceof Error ? e : new Error("Gagal memuat tiket");
    return null;
  } finally {
    pending.value = false;
    loadAttempted.value = true;
  }
}

async function refresh() {
  return loadTicket(true);
}

watch(viewToken, () => {
  ticket.value = null;
  loadAttempted.value = false;
  pending.value = true;
  void loadTicket();
});

const ticketNum = computed(() => String(ticket.value?.ticket_number || "").trim());

const claimPhone = ref("");
const verifyingClaim = ref(false);
const claimError = ref("");

const phoneVerified = computed(() => !!ticket.value?.phone_verified);

watch(phone, (p) => {
  if (p && !claimPhone.value) claimPhone.value = p;
}, { immediate: true });

async function verifyClaim() {
  const token = viewToken.value;
  const p = claimPhone.value.trim();
  if (!token || !p) {
    claimError.value = "Masukkan nomor HP pelapor";
    return;
  }
  verifyingClaim.value = true;
  claimError.value = "";
  try {
    const res = await $fetch<{ data: any }>(
      `${config.public.apiBaseUrl}/api/v1/order/view/${encodeURIComponent(token)}/verify-phone`,
      { method: "POST", body: { phone: p } },
    );
    if (res?.data?.phone_verified) {
      phone.value = p;
      saveProfile();
      saveTicketAccess(token, p);
      ticket.value = res.data;
      toast.success("Tiket berhasil diverifikasi");
    } else {
      claimError.value = "Nomor HP tidak cocok dengan data pelapor";
    }
  } catch (err: unknown) {
    const msg =
      (err as { data?: { message?: string } })?.data?.message ||
      "Nomor HP tidak cocok dengan data pelapor";
    claimError.value = msg;
  } finally {
    verifyingClaim.value = false;
  }
}

watch(
  ticket,
  (t) => {
    if (!t) return;
    emit("meta", {
      status: String(t.status || ""),
      unitName: String(t.unit_name || ""),
    });
  },
  { deep: true, immediate: true },
);

/** Only block UI on first load — polling refresh must not swap to skeleton. */
const showSkeleton = computed(() => !loadAttempted.value || (pending.value && !ticket.value));
const showNotFound = computed(() => loadAttempted.value && !pending.value && (error.value || !ticket.value));
const isRefreshing = ref(false);

async function softRefresh() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    // Bypass Nuxt cache merge — assign fresh payload so live GPS always applies.
    const fresh = await fetchTicket(true);
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
    case "waiting_unit":
      return { text: "Menunggu respons unit", tone: "bg-amber-600" };
    case "searching":
      return { text: "Mencari unit", tone: "bg-slate-500" };
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

type DetailField = { key: string; label: string; value: string };

const showDetails = ref(false);
const conditionOpen = ref(false);
const historyOpen = ref(false);

const summaryDetailFields = computed((): DetailField[] => {
  const t = ticket.value;
  if (!t || !phoneVerified.value) return [];
  const fields: DetailField[] = [];
  if (t.requester_name) {
    fields.push({ key: "name", label: "Pelapor", value: t.requester_name });
  }
  if (t.requester_phone) {
    fields.push({ key: "phone", label: "No. HP", value: t.requester_phone });
  }
  return fields;
});

const jobTick = ref(0);

function currentUnitId(t: any) {
  return String(t?.emergency_uuid || t?.unit_name || "").trim();
}

function persistJobLink(t: any) {
  const token = String(t?.track_token || "").trim();
  const number = String(t?.ticket_number || ticketNum.value || "").trim();
  if (!number) return;
  const uid = String(t?.emergency_uuid || "").trim();
  const prev = loadUnitJobLink(number);
  // Public GET omits track_token unless pelapor phone is verified. Never wipe a
  // token saved from create — that is the WA /dispatch link.
  if (!token) return;
  if (prev?.token === token && (!uid || !prev.unitId || prev.unitId === uid)) return;
  saveUnitJobLink(number, token, uid || prev?.unitId);
  jobTick.value += 1;
}

watch(
  ticket,
  (t, prev) => {
    if (!t) return;
    persistJobLink(t);
    const prevId = currentUnitId(prev);
    const nextId = currentUnitId(t);
    if (
      prevId &&
      nextId &&
      prevId !== nextId &&
      t.wa_dispatch &&
      t.status === "pending"
    ) {
      toast.success(
        `Dialihkan ke ${t.unit_name || "unit lain"}. Kirim WhatsApp lagi dengan link tugas terbaru.`,
      );
    }
  },
  { deep: true, immediate: true },
);

function resolveDispatchToken(t: any): string {
  void jobTick.value;
  const fromTicket = String(t?.track_token || "").trim();
  if (fromTicket) return fromTicket;
  const job = loadUnitJobLink(String(t?.ticket_number || ticketNum.value || ""));
  return String(job?.token || "").trim();
}

function buildWAMessage(t: any) {
  const token = resolveDispatchToken(t);
  return buildUnitWaMessage({
    unitName: t.unit_name,
    ticketNumber: t.ticket_number,
    requesterName: t.requester_name,
    requesterPhone: t.requester_phone,
    address: t.location,
    condition: t.condition,
    lat: t.requester_lat,
    lng: t.requester_lng,
    dispatchUrl: token ? dispatchJobUrl(token) : undefined,
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
  if (t.jenis_pelayanan) n += 1;
  if (t.location) n += 1;
  if (t.condition) n += 1;
  if (t.photo_url) n += 1;
  if (t.handler_name || t.handling_notes) n += 1;
  if (historyItems.value.length) n += 1;
  return n;
});

const hasCollapsibleDetails = computed(() => moreDetailCount.value > 0);

const conditionAnswers = computed(() =>
  triageAnswersFrom(undefined, ticket.value?.condition).filter((a) => a.value !== "unknown"),
);

const conditionSectionTitle = computed(() =>
  assessmentSectionMeta(
    conditionAnswers.value.length ? inferAssessmentCategory(conditionAnswers.value) : undefined,
  ).title,
);

const conditionPreview = computed(() => {
  const rows = conditionAnswers.value;
  if (!rows.length) {
    const raw = String(ticket.value?.condition || "").trim();
    return raw.length > 48 ? `${raw.slice(0, 48)}…` : raw;
  }
  const flagged = rows.filter((a) => a.tone === "critical" || a.tone === "warn").length;
  const snippet = rows
    .slice(0, 2)
    .map((a) => `${a.short}: ${assessmentAnswerLabel(a.value)}`)
    .join(" · ");
  const suffix = rows.length > 2 ? "…" : "";
  if (flagged) return `${snippet}${suffix} · ${flagged} perlu perhatian`;
  return `${snippet}${suffix}`;
});

const historyPreview = computed(() => {
  const items = historyItems.value;
  if (!items.length) return "";
  const last = items[items.length - 1];
  return `${historyShort(last)} · ${historyTime(last.created_at)}`;
});

watch(showDetails, (open) => {
  if (!open) {
    conditionOpen.value = false;
    historyOpen.value = false;
    historyExpanded.value = false;
  }
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
const reviewStorageKey = computed(() => `bb-reviewed-${viewToken.value}`);

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
const needsWaFollowUp = computed(() => {
  void jobTick.value;
  const t = ticket.value;
  if (!t) return false;
  if (t.status === "completed" || t.status === "cancelled") return false;
  const hasJob = !!loadUnitJobLink(ticketNum.value)?.token;
  if (!t.wa_dispatch && !hasJob) return false;
  if (t.status !== "pending" && citizenPhase.value !== "reassigned") return false;
  const uid = currentUnitId(t);
  if (!uid) return false;
  return !wasWaFollowupSent(ticketNum.value, uid);
});

const waFollowupHeadline = computed(() => {
  if (citizenPhase.value === "reassigned") return "Unit baru — kirim lagi";
  return "Petugas belum tahu laporan ini";
});

const waFollowupCopy = computed(() => {
  const t = ticket.value;
  if (citizenPhase.value === "reassigned") {
    const name = t?.unit_name || "unit baru";
    return `${name} tidak punya dashboard. Mereka baru tahu tiket ini setelah kamu kirim WhatsApp.`;
  }
  return "Unit ini tanpa dashboard — mereka tidak akan melihat laporan ini sampai kamu kirim WhatsApp.";
});

function onWaFollowupClick() {
  const t = ticket.value;
  if (!t) return;
  markWaFollowupSent(ticketNum.value, currentUnitId(t));
  jobTick.value += 1;
}

const contactWaAction = computed(() => {
  if (!ticket.value || !canContactUnit.value) return null;
  const href = unitWaUrl.value || waUrl.value;
  if (!href) return null;
  return {
    href,
    label: needsWaFollowUp.value
      ? citizenPhase.value === "reassigned"
        ? "Kirim WhatsApp ke unit baru"
        : "Kirim WhatsApp ke unit"
      : "Hubungi unit via WhatsApp",
  };
});

async function submitReview() {
  if (!ticket.value || unitHelpful.value === null || !phoneVerified.value) return;
  submittingReview.value = true;
  const ticketNumber = String(
    ticket.value.ticket_number || ticketNum.value || ""
  ).trim();
  const emergencyId = String(ticket.value.emergency_uuid || "").trim();
  const requesterPhone = claimPhoneForFetch();
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        ...(emergencyId ? { emergency_id: emergencyId, emergency_uuid: emergencyId } : {}),
        ticket_number: ticketNumber,
        requester_phone: requesterPhone,
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
  () => hasLiveResponder.value || isEnRoute.value,
);

function pollIntervalMs() {
  const status = ticket.value?.status;
  if (!status || TERMINAL.has(status)) return 0;
  if (liveTracking.value) return 4_000;
  const phase = citizenPhase.value;
  if (
    status === "pending" ||
    phase === "reassigned" ||
    phase === "searching" ||
    phase === "waiting_unit" ||
    phase === "exhausted" ||
    phase === "escalated_psc"
  ) {
    return 4_000;
  }
  return 8_000;
}

function restartPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (!import.meta.client) return;
  const ms = pollIntervalMs();
  if (!ms) return;
  pollTimer = setInterval(() => {
    void softRefresh();
  }, ms);
}

function onTicketVisible() {
  if (document.visibilityState !== "visible") return;
  const status = ticket.value?.status;
  if (!status || TERMINAL.has(status)) return;
  void softRefresh();
}

watch(
  () => [ticket.value?.status, ticket.value?.emergency_uuid, ticket.value?.dispatch_round, liveTracking.value] as const,
  (curr, prev) => {
    restartPolling();
    if (curr[0] !== prev?.[0] || (curr[3] && !prev?.[3])) void softRefresh();
  },
);

watch(phone, (p, prev) => {
  if (p && p !== prev && loadAttempted.value) void softRefresh();
});

if (import.meta.client) {
  void loadTicket();
}

onMounted(() => {
  if (import.meta.client && localStorage.getItem(reviewStorageKey.value)) {
    reviewSubmitted.value = true;
  }
  slaTimer = setInterval(() => { nowTick.value = Date.now(); }, 1000);
  if (import.meta.client) {
    document.addEventListener("visibilitychange", onTicketVisible);
    restartPolling();
  }
});
onUnmounted(() => {
  if (slaTimer) clearInterval(slaTimer);
  if (pollTimer) clearInterval(pollTimer);
  if (import.meta.client) {
    document.removeEventListener("visibilitychange", onTicketVisible);
  }
});

const TRACK_STEPS = [
  { key: "diproses", label: "Diproses" },
  { key: "otw", label: "OTW" },
  { key: "penanganan", label: "Penanganan" },
  { key: "selesai", label: "Selesai" },
] as const;

const trackSteps = computed(() =>
  TRACK_STEPS.map((step) =>
    step.key === "otw" && citizenPhase.value === "accepted"
      ? { ...step, label: "Diterima" }
      : step,
  ),
);

/**
 * 0 Diproses · 1 OTW · 2 Penanganan · 3 Selesai
 * cancelled → muted (−1)
 * Do not use liveTracking / track_enabled_at — WA-only create mints a magic
 * link immediately, which is not the same as the unit being en route.
 */
const trackStepIndex = computed(() => citizenTrackStepIndex(ticket.value));

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
  if (!phoneVerified.value) return;
  const n = ticket.value?.ticket_number;
  if (!n || !import.meta.client) return;
  try {
    await navigator.clipboard.writeText(n);
    toast.success("Nomor tiket disalin");
  } catch {
    toast.error("Gagal menyalin");
  }
}

async function shareTicket() {
  if (!phoneVerified.value || !import.meta.client) return;
  const url = ticketViewUrl(viewToken.value);
  try {
    if (navigator.share) {
      await navigator.share({
        title: "E-Tiket ButuhBantuan",
        text: "Pantau status permintaan bantuan darurat. Verifikasi nomor HP pelapor untuk membuka.",
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link e-tiket disalin");
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === "AbortError") return;
    toast.error("Gagal membagikan link");
  }
}

watch(
  () => ticket.value?.phone_verified,
  (verified) => {
    if (!verified) return;
    const p = claimPhoneForFetch();
    if (p) saveTicketAccess(viewToken.value, p);
  },
);

// ── Web Push opt-in ────────────────────────────────────────────────────────────
const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = useWebPush(ticketNum);

const pushVisible = computed(() => {
  const t = ticket.value;
  return pushSupported.value && t != null && !TERMINAL.has(t.status);
});

defineExpose({
  softRefresh,
  shareTicket,
  isRefreshing,
  phoneVerified,
  pushSupported,
  pushSubscribed,
  pushLoading,
  pushVisible,
  pushSubscribe,
  pushUnsubscribe,
});
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
        <div v-else-if="showNotFound" class="ui-card p-8 text-center">
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
          <div class="ui-card overflow-hidden eticket-ui">

            <!-- Process banner (petugas-style dark strip) -->
            <div
              v-if="urgencyBanner"
              class="px-4 py-2 text-center text-xs font-medium text-white tracking-wide"
              :class="urgencyBanner.tone"
            >
              {{ urgencyBanner.text }}
            </div>

            <template v-if="activeView === 'ticket'">
              <!-- Claim e-ticket on new device -->
              <div
                v-if="!phoneVerified"
                class="mx-5 mb-4 overflow-hidden"
                style="
                  background: var(--bb-bg-muted);
                  border-radius: var(--bb-radius-card);
                "
              >
                <div class="px-4 pt-3.5 pb-3">
                  <div class="flex items-start gap-3">
                    <div
                      class="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-amber-50 text-amber-700"
                    >
                      <Icon icon="lucide:shield-check" class="text-base" />
                    </div>
                    <div class="min-w-0">
                      <p class="m-0 text-sm font-semibold text-neutral-900 leading-snug">
                        Verifikasi nomor HP
                      </p>
                      <p class="m-0 mt-1 text-[13px] text-neutral-600 leading-snug">
                        Masukkan nomor HP pelapor untuk melihat detail, live tracking, dan membagikan ke keluarga.
                      </p>
                      <p
                        v-if="ticket.requester_phone"
                        class="m-0 mt-2 text-xs text-neutral-500"
                      >
                        Terdaftar: {{ ticket.requester_phone }}
                      </p>
                    </div>
                  </div>
                  <label class="block mt-3">
                    <span class="text-[11px] font-medium text-neutral-500">No. HP pelapor</span>
                    <input
                      v-model="claimPhone"
                      type="tel"
                      inputmode="tel"
                      autocomplete="tel"
                      placeholder="08xxxxxxxxxx"
                      class="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                      @keydown.enter.prevent="verifyClaim"
                    >
                  </label>
                  <p v-if="claimError" class="m-0 mt-2 text-sm text-red-600">{{ claimError }}</p>
                  <button
                    type="button"
                    class="mt-3 w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                    :disabled="verifyingClaim || !claimPhone.trim()"
                    @click="verifyClaim"
                  >
                    {{ verifyingClaim ? "Memverifikasi…" : "Verifikasi" }}
                  </button>
                </div>
              </div>

              <!-- Status header + progress — visible before phone verify -->
              <div class="px-5 pt-4 pb-2">
                <div class="flex items-start gap-3">
                  <div
                    class="w-9 h-9 rounded-full bg-neutral-50 ring-1 ring-neutral-200 flex items-center justify-center shrink-0"
                  >
                    <Icon icon="lucide:ticket" class="text-base text-neutral-400" />
                  </div>
                  <div class="min-w-0 flex-1 flex flex-col gap-0.5">
                    <h1 class="eticket-title truncate m-0">
                      {{ cardTitle }}
                    </h1>
                    <p
                      v-if="ticket.ticket_number"
                      class="eticket-meta font-mono m-0"
                    >
                      {{ ticket.ticket_number }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- FROM → TO (horizontal) -->
              <div class="px-5 pb-4">
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="eticket-value-emphasis leading-snug line-clamp-2">
                      {{ fromParty.detail }}
                    </p>
                    <p class="eticket-label mt-0.5">{{ fromParty.title }}</p>
                  </div>
                  <div class="pt-3 shrink-0 text-neutral-300">
                    <Icon icon="lucide:arrow-right" class="text-base" />
                  </div>
                  <div class="min-w-0 flex-1 text-right">
                    <p class="eticket-value-emphasis leading-snug line-clamp-2">
                      {{ phoneVerified ? toParty.detail : "Verifikasi HP" }}
                    </p>
                    <p class="eticket-label mt-0.5">{{ toParty.title }}</p>
                  </div>
                </div>
              </div>

              <!-- Horizontal progress -->
              <div class="px-5 pb-4" :class="trackMuted && 'opacity-45'">
                <div class="relative w-full">
                  <div
                    class="absolute left-0 right-0 top-[5px] h-0.5 rounded-full bg-neutral-200"
                  />
                  <div
                    class="absolute left-0 top-[5px] h-0.5 rounded-full transition-all duration-300"
                    :style="{
                      width: trackProgressWidth,
                      background: trackMuted ? '#e5e5e5' : trackAccent.line,
                    }"
                  />
                  <div class="relative flex justify-between items-start w-full">
                    <div
                      v-for="(step, i) in trackSteps"
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
                        class="w-2.5 h-2.5 rounded-full shrink-0 transition-colors ring-2 ring-white"
                        :style="
                          !trackMuted && trackStepIndex >= i
                            ? {
                                background: trackAccent.line,
                                boxShadow:
                                  trackStepIndex === i
                                    ? `0 0 0 3px ${trackAccent.line}22`
                                    : undefined,
                              }
                            : { background: '#d0d5dd' }
                        "
                      />
                      <p
                        class="mt-2 text-[12px] max-w-[4rem] font-normal"
                        :class="[
                          i === 0
                            ? 'text-left'
                            : i === TRACK_STEPS.length - 1
                              ? 'text-right'
                              : 'text-center',
                          !trackMuted && trackStepIndex >= i
                            ? 'text-neutral-600'
                            : 'text-neutral-400',
                        ]"
                      >
                        {{ step.label }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="phoneVerified">
              <!-- Primary CTA -->
              <div
                v-if="contactWaAction || primaryAction || (ticket.status === 'pending' && !needsFollowUp)"
                class="px-5 pb-4 space-y-2"
              >
                <div
                  v-if="needsWaFollowUp && contactWaAction"
                  class="overflow-hidden"
                  style="
                    background: var(--bb-bg-muted);
                    border-radius: var(--bb-radius-card);
                  "
                >
                  <div class="px-4 pt-3.5 pb-3 flex items-start gap-3">
                    <div
                      class="w-9 h-9 shrink-0 flex items-center justify-center"
                      style="
                        border-radius: var(--bb-radius-pill);
                        background: var(--bb-accent-soft);
                        color: var(--bb-accent);
                      "
                    >
                      <Icon icon="lucide:send" class="text-base" />
                    </div>
                    <div class="min-w-0">
                      <p
                        class="m-0 text-sm font-semibold leading-snug"
                        style="color: var(--bb-text)"
                      >
                        {{ waFollowupHeadline }}
                      </p>
                      <p
                        class="m-0 mt-1 text-[13px] leading-snug"
                        style="color: var(--bb-text-secondary)"
                      >
                        {{ waFollowupCopy }}
                      </p>
                    </div>
                  </div>
                  <div class="px-3 pb-3">
                    <a
                      :href="contactWaAction.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:scale-[0.98] transition-all"
                      @click="onWaFollowupClick"
                    >
                      <Icon icon="mdi:whatsapp" class="text-lg" />
                      {{ contactWaAction.label }}
                    </a>
                  </div>
                </div>
                <a
                  v-else-if="contactWaAction"
                  :href="contactWaAction.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:scale-[0.98] transition-all"
                  @click="onWaFollowupClick"
                >
                  <Icon icon="mdi:whatsapp" class="text-lg" />
                  {{ contactWaAction.label }}
                </a>
                <a
                  v-if="primaryAction?.type === 'tel'"
                  :href="primaryAction.href"
                  class="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm ui-btn-primary active:scale-[0.98] transition-all"
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

              <!-- Detail panel: pelapor (always) + expandable rows -->
              <div
                v-if="summaryDetailFields.length || (showDetails && hasCollapsibleDetails)"
                class="px-5 pb-1"
              >
                <div class="eticket-panel">
                  <div
                    v-for="field in summaryDetailFields"
                    :key="field.key"
                    class="eticket-panel-row"
                  >
                    <span class="eticket-panel-label">{{ field.label }}</span>
                    <span class="eticket-panel-value truncate max-w-[58%]">{{ field.value }}</span>
                  </div>

                  <template v-if="showDetails">
                    <div v-if="ticket.jenis_pelayanan" class="eticket-panel-row">
                      <span class="eticket-panel-label">Jenis pelayanan</span>
                      <span class="eticket-panel-value">{{ jenisPelayananLabel(ticket.jenis_pelayanan) }}</span>
                    </div>

                    <div v-if="ticket.location" class="eticket-panel-row eticket-panel-row--stack">
                      <span class="eticket-panel-label shrink-0">Lokasi</span>
                      <span class="eticket-panel-value text-right leading-relaxed">{{ ticket.location }}</span>
                    </div>

                    <div v-if="ticket.condition" class="eticket-subsection">
                      <button
                        type="button"
                        class="eticket-subsection-head"
                        @click="conditionOpen = !conditionOpen"
                      >
                        <span class="eticket-panel-label shrink-0">{{ conditionSectionTitle }}</span>
                        <span v-if="!conditionOpen" class="eticket-subsection-hint truncate">{{ conditionPreview }}</span>
                        <Icon
                          :icon="conditionOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                          class="shrink-0 text-neutral-400 text-base ml-auto"
                        />
                      </button>
                      <div v-if="conditionOpen" class="eticket-subsection-body">
                        <TicketConditionBlock embedded :condition="ticket.condition" />
                      </div>
                    </div>

                    <button
                      v-if="ticket.photo_url"
                      type="button"
                      class="eticket-panel-row eticket-panel-row--action w-full"
                      @click="lightboxPhoto = assetUrl(ticket.photo_url)"
                    >
                      <span class="eticket-panel-label flex items-center gap-2">
                        <Icon icon="lucide:camera" class="text-neutral-400" />
                        Foto laporan
                      </span>
                      <Icon icon="lucide:chevron-right" class="text-neutral-400 shrink-0" />
                    </button>

                    <div
                      v-if="ticket.handler_name || ticket.handling_notes"
                      class="eticket-panel-row eticket-panel-row--stack"
                    >
                      <span class="eticket-panel-label">Penanganan</span>
                      <div class="text-right space-y-1 max-w-[65%]">
                        <p v-if="ticket.handler_name" class="eticket-panel-value m-0">{{ ticket.handler_name }}</p>
                        <p v-if="ticket.handling_notes" class="eticket-panel-value m-0 text-neutral-500">{{ ticket.handling_notes }}</p>
                      </div>
                    </div>

                    <div v-if="historyItems.length" class="eticket-subsection">
                      <button
                        type="button"
                        class="eticket-subsection-head"
                        @click="historyOpen = !historyOpen"
                      >
                        <span class="eticket-panel-label shrink-0">Riwayat</span>
                        <span v-if="!historyOpen" class="eticket-subsection-hint truncate">{{ historyPreview }}</span>
                        <Icon
                          :icon="historyOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                          class="shrink-0 text-neutral-400 text-base ml-auto"
                        />
                      </button>
                      <div v-if="historyOpen" class="eticket-timeline">
                        <div
                          v-for="(ev, idx) in visibleHistory"
                          :key="ev.id || `${ev.type}-${ev.created_at}-${idx}`"
                          class="eticket-timeline-item"
                        >
                          <div class="eticket-timeline-time">{{ historyTime(ev.created_at) }}</div>
                          <div class="eticket-timeline-body">
                            <p class="eticket-timeline-title">{{ historyShort(ev) }}</p>
                          </div>
                        </div>
                        <button
                          v-if="hiddenHistoryCount > 0"
                          type="button"
                          class="eticket-timeline-more"
                          @click="historyExpanded = !historyExpanded"
                        >
                          {{ historyExpanded ? "Sembunyikan" : `+${hiddenHistoryCount} sebelumnya` }}
                        </button>
                      </div>
                    </div>
                  </template>
                </div>

                <div v-if="hasCollapsibleDetails" class="eticket-expand">
                  <button
                    type="button"
                    class="eticket-expand-btn"
                    @click="showDetails = !showDetails"
                  >
                    {{
                      showDetails
                        ? "Sembunyikan"
                        : moreDetailCount > 0
                          ? `${moreDetailCount} detail lagi`
                          : "Lihat detail"
                    }}
                    <Icon
                      :icon="showDetails ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                      class="text-sm"
                    />
                  </button>
                </div>
              </div>
              </div>
            </template>

            <!-- ── VIEW: Review ── -->
            <template v-else-if="phoneVerified">
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
