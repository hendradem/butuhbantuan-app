<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Detail Pesanan" });

const route = useRoute();
const { authGet, baseUrl } = useApi();
const { goBack } = useSmartBack(adminOrderBackTo);

const ticketNumber = computed(() => String(route.params.ticket));

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseUrl + url;
}

const { data, pending, error, refresh: refreshOrder } = await useAsyncData(
  `order-detail-${ticketNumber.value}`,
  () => authGet<{ data: any }>(`/api/v1/admin/orders/by-ticket/${ticketNumber.value}`).then(r => r.data),
  { server: false }
);

const refresh = useSoftRefresh(refreshOrder);
const order = computed(() => data.value ?? null);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

const TERMINAL = new Set(["completed", "cancelled"]);

function onAdminOrderLive() {
  const status = order.value?.status;
  if (status && TERMINAL.has(status)) return;
  void refresh();
}

type MobilePane = "steps" | "detail";
const mobilePane = ref<MobilePane>("steps");

watch(
  () => order.value?.status,
  (status) => {
    if (!status) return;
    // Prefer steps when there are actions; cancelled has no steps pane content
    mobilePane.value = status === "cancelled" ? "detail" : "steps";
  },
  { immediate: true },
);

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Auto refresh while active (faster when field GPS is live)
let pollTimer: ReturnType<typeof setInterval> | null = null;
function restartOrderPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  const status = order.value?.status;
  if (!import.meta.client || !status || TERMINAL.has(status)) return;
  const hasGps =
    !!(Number(order.value?.responder_lat) || Number(order.value?.responder_lng)) ||
    !!order.value?.track_enabled_at;
  pollTimer = setInterval(() => refresh(), hasGps ? 8_000 : 15_000);
}
watch(
  () => [order.value?.status, order.value?.responder_updated_at, order.value?.track_enabled_at],
  () => restartOrderPoll(),
);
onMounted(() => {
  if (import.meta.client) {
    window.addEventListener("bb:admin-order-live", onAdminOrderLive);
  }
  restartOrderPoll();
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (import.meta.client) {
    window.removeEventListener("bb:admin-order-live", onAdminOrderLive);
  }
});

const lightboxPhoto = ref<string | null>(null);

const { accept, reject, escalatePsc, cancel, acting } = useOrderDispatch("admin");
const showReassign = ref(false);
const showReject = ref(false);
const showCancel = ref(false);
const cancelling = ref(false);
const { items: historyItems, loading: historyLoading, load: loadHistory } = useOrderHistory("admin");

watch(
  () => order.value?.id,
  (id) => {
    if (id) loadHistory(order.value);
  },
  { immediate: true }
);

async function doAccept() {
  if (!order.value?.id) return;
  if (await accept(order.value.id)) {
    await refresh();
    loadHistory(order.value);
  }
}
async function doRejectConfirm(payload: { reason: string; note: string }) {
  if (!order.value?.id) return;
  if (await reject(order.value.id, payload)) {
    await refresh();
    loadHistory(order.value);
  }
}

async function doEscalate() {
  if (!order.value?.id) return;
  if (await escalatePsc(order.value.id)) {
    await refresh();
    loadHistory(order.value);
  }
}

async function confirmCancel() {
  if (!order.value?.id || cancelling.value) return;
  cancelling.value = true;
  try {
    if (await cancel(order.value.id)) {
      showCancel.value = false;
      await refresh();
      loadHistory(order.value);
    }
  } finally {
    cancelling.value = false;
  }
}

async function onReassignDone() {
  await refresh();
  loadHistory(order.value);
}

const updating = ref(false);
const { token } = useAuth();

// ── WA status update ──────────────────────────────────────────────────────────
const config = useRuntimeConfig();
const webAppUrl = (config.public.webAppUrl as string) || "";

function _formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("62")) return d;
  return d;
}

const WA_MESSAGES: Record<string, string> = {
  pending:     "Kami telah menerima laporan Anda dan sedang mencari unit darurat terdekat yang tersedia.",
  accepted:    "Unit darurat telah menerima laporan Anda dan akan segera menuju lokasi.",
  in_progress: "Petugas kami sedang dalam perjalanan menuju lokasi Anda. Harap tetap di posisi yang aman.",
  completed:   "Laporan Anda telah selesai ditangani. Terima kasih telah menggunakan ButuhBantuan. 🙏",
};

const WA_LABELS: Record<string, string> = {
  pending:     "Update: Sedang mencari unit",
  accepted:    "Update: Unit menuju lokasi",
  in_progress: "Update: Petugas dalam perjalanan",
  completed:   "Update: Penanganan selesai",
};

const waStatusUrl = computed(() => {
  const o = order.value;
  if (!o?.requester_phone || !o.status || o.status === "cancelled") return "";
  const phone = _formatPhone(o.requester_phone);
  const eticketUrl = webAppUrl
    ? `${webAppUrl.replace(/\/$/, "")}/ticket/${o.ticket_number}`
    : "";
  const body = WA_MESSAGES[o.status] ?? "Laporan Anda sedang kami tangani.";
  const lines = [
    `Halo *${o.requester_name || "Pelapor"}*,`,
    "",
    body,
    "",
    `📋 *No. Tiket:* ${o.ticket_number || ""}`,
    o.location ? `📍 *Lokasi:* ${o.location}` : null,
    eticketUrl ? `\nPantau status: ${eticketUrl}` : null,
    "",
    `— *${o.unit_name || "Tim ButuhBantuan"}*`,
  ].filter((l) => l !== null).join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
});

const waStatusLabel = computed(() => WA_LABELS[order.value?.status ?? ""] ?? "Kirim Update Status");

// ── WA dispatch link (kirim ke unit) ─────────────────────────────────────────
const dispatchToken = ref("");
const generatingLink = ref(false);
const linkCopied = ref(false);

// Sync from order data if track was already enabled
watch(
  () => order.value?.track_token,
  (t) => { if (t && !dispatchToken.value) dispatchToken.value = t; },
  { immediate: true },
);

const dispatchUrl = computed(() => {
  if (!dispatchToken.value || !webAppUrl) return "";
  return `${webAppUrl.replace(/\/$/, "")}/dispatch/${dispatchToken.value}`;
});

// Whether to show the dispatch card: any active order can have a WA dispatch link generated
const showDispatchCard = computed(() => {
  const o = order.value;
  if (!o) return false;
  return o.status !== "cancelled" && o.status !== "completed";
});

const waDispatchUrl = computed(() => {
  const o = order.value;
  const url = dispatchUrl.value;
  if (!url) return "";
  const phone = o?.unit_whatsapp || o?.unit_phone || "";
  const digits = phone ? _formatPhone(phone) : "";
  const lines = [
    `*🚨 Penugasan Darurat — ButuhBantuan*`,
    ``,
    `Anda mendapat penugasan baru. Buka link berikut untuk merespons:`,
    ``,
    `🔗 ${url}`,
    ``,
    o?.ticket_number ? `📋 Tiket: *${o.ticket_number}*` : null,
    o?.condition ? `🩺 Kondisi: ${o.condition}` : null,
    o?.location ? `📍 Lokasi: ${o.location}` : null,
    ``,
    `⚠️ Respon sebelum waktu habis. Link berlaku 12 jam.`,
    `— Posko ButuhBantuan`,
  ].filter((l) => l !== null).join("\n");
  const encoded = encodeURIComponent(lines);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
});

async function generateDispatchLink() {
  if (!order.value?.id || generatingLink.value) return;
  generatingLink.value = true;
  try {
    const res = await $fetch<{ data: { track_token?: string } }>(
      `${baseUrl}/api/v1/admin/orders/${order.value.id}/track/enable`,
      { method: "POST", headers: token.value ? { "X-Admin-Key": token.value } : {} },
    );
    dispatchToken.value = res.data?.track_token ?? "";
    await refresh();
  } catch {
    // token may already exist — refresh to get it
    await refresh();
  } finally {
    generatingLink.value = false;
  }
}

async function copyDispatchLink() {
  if (!dispatchUrl.value || !import.meta.client) return;
  await navigator.clipboard.writeText(dispatchUrl.value);
  linkCopied.value = true;
  setTimeout(() => { linkCopied.value = false; }, 2000);
}

const hasReport = computed(() => {
  if (order.value?.has_incident_report) return true;
  if (!import.meta.client || !order.value?.ticket_number) return false;
  try {
    return !!localStorage.getItem(`bb-report-${order.value.ticket_number}`);
  } catch {
    return false;
  }
});

// Feedback warga (filter per unit + jendela waktu tiket)
const { data: feedbackData } = await useAsyncData(
  computed(() => `admin-feedback-detail-${order.value?.emergency_uuid || "none"}`),
  () => {
    const uuid = order.value?.emergency_uuid;
    if (!uuid) return Promise.resolve([] as any[]);
    return authGet<{ data: any[] }>(`/api/v1/feedback/unit/${uuid}`)
      .then((r) => r.data ?? [])
      .catch(() => []);
  },
  { server: false, watch: [() => order.value?.emergency_uuid] },
);

const relatedFeedback = computed(() => {
  const o = order.value;
  const list = feedbackData.value ?? [];
  if (!o || !list.length) return [];
  const start = new Date(o.created_at).getTime();
  if (Number.isNaN(start)) return [];
  const endBase = o.completed_at ? new Date(o.completed_at).getTime() : Date.now();
  const end = endBase + 7 * 24 * 60 * 60 * 1000;
  return list
    .filter((f: any) => {
      const t = new Date(f.created_at).getTime();
      return Number.isFinite(t) && t >= start && t <= end;
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
});

function formatFeedbackDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function doArrive() {
  if (!order.value?.id || updating.value) return;
  updating.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/admin/orders/${order.value.id}/arrive`, {
      method: "POST",
      headers: token.value ? { "X-Admin-Key": token.value } : {},
    });
    await refresh();
    loadHistory(order.value);
  } finally {
    updating.value = false;
  }
}

async function onNextStep(action: string) {
  switch (action) {
    case "accept":
      await doAccept();
      break;
    case "reject":
      showReject.value = true;
      break;
    case "reassign":
      showReassign.value = true;
      break;
    case "escalate":
      await doEscalate();
      break;
    case "cancel":
      showCancel.value = true;
      break;
    case "arrive":
      await doArrive();
      break;
    case "report":
      if (order.value?.ticket_number) {
        await navigateTo(`/reports?ticket=${order.value.ticket_number}`);
      }
      break;
  }
}
</script>

<template>
  <div>
    <!-- Sticky header -->
    <div class="page-subheader">
      <div class="flex items-center justify-between gap-3 min-w-0">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
            aria-label="Kembali"
            @click="goBack"
          >
            <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
          </button>
          <div class="page-subheader-meta min-w-0">
            <h1 class="page-subheader-title font-mono truncate">{{ ticketNumber }}</h1>
            <p class="page-subheader-desc">
              <template v-if="order">{{ formatDate(order.created_at) }}</template>
              <span
                v-else-if="showSkeleton"
                class="soft-skel inline-block h-3 w-28 align-middle"
                aria-hidden="true"
              />
              <span v-else class="invisible">—</span>
            </p>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1 min-w-0 max-w-[9rem] sm:max-w-[14rem] md:max-w-[18rem] shrink-0">
          <span
            v-if="order?.unit_name"
            class="text-sm font-medium text-neutral-600 truncate w-full text-right"
          >{{ order.unit_name }}</span>
          <span
            v-else-if="showSkeleton"
            class="soft-skel inline-block h-4 w-24 rounded"
            aria-hidden="true"
          />
          <div class="flex items-center justify-end gap-1.5 flex-wrap">
            <span
              v-if="order?.partner_tier === 'psc' || order?.partner_tier === 'verified'"
              class="hidden sm:inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 shrink-0"
            >
              {{ order.partner_tier === 'psc' ? 'PSC' : 'Swasta' }}
            </span>
            <UiStatusBadge v-if="order" :status="order.status" class="shrink-0" />
            <span
              v-else-if="showSkeleton"
              class="soft-skel inline-block h-5 w-16 rounded-full shrink-0"
              aria-hidden="true"
            />
            <OrderTriageBadge :acuity="order?.assessment_acuity" />
            <span
              v-if="order?.source === 'sos'"
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emergency-600 text-white uppercase animate-pulse shrink-0"
            >
              <Icon icon="lucide:siren" class="text-[10px]" />
              SOS
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading (initial only — refresh keeps content + scroll) -->
    <OrderDetailSkeleton v-if="showSkeleton" />

    <!-- Not found -->
    <div v-else-if="error || !order" class="flex items-center justify-center p-12">
      <div class="text-center">
        <Icon icon="lucide:file-x" class="text-neutral-300 text-4xl mx-auto mb-3" />
        <p class="font-semibold text-neutral-700">Pesanan tidak ditemukan</p>
        <p class="text-sm text-neutral-400 mt-1">Nomor tiket tidak valid atau sudah dihapus.</p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium"
          @click="goBack"
        >
          <Icon icon="lucide:arrow-left" class="text-sm" />
          Kembali
        </button>
      </div>
    </div>

    <div v-else class="p-4 sm:p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Mobile: Langkah | Detail -->
        <div class="lg:hidden sticky top-[4.25rem] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-3 bg-neutral-50/95 backdrop-blur border-b border-neutral-100">
          <div class="grid grid-cols-2 p-0.5 rounded-lg bg-neutral-200/70">
            <button
              type="button"
              :class="[
                'py-2 rounded-md text-sm font-medium transition-colors',
                mobilePane === 'steps' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
              ]"
              @click="mobilePane = 'steps'"
            >
              Langkah
            </button>
            <button
              type="button"
              :class="[
                'py-2 rounded-md text-sm font-medium transition-colors',
                mobilePane === 'detail' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500',
              ]"
              @click="mobilePane = 'detail'"
            >
              Detail
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          <aside
            :class="[
              'lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4',
              mobilePane === 'detail' ? 'hidden lg:block' : 'block',
            ]"
          >
            <OrderNextStep
              v-if="order.status !== 'cancelled'"
              :order="order"
              mode="admin"
              :acting="acting === order.id"
              :updating="updating"
              :has-report="hasReport"
              @action="onNextStep"
              @refreshed="refresh"
            />

            <div
              v-if="order.status === 'cancelled'"
              class="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center gap-3"
            >
              <div class="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <Icon icon="lucide:x" class="text-neutral-500 text-sm" />
              </div>
              <div>
                <p class="text-sm font-semibold text-neutral-900">Pesanan dibatalkan</p>
                <p class="text-sm text-neutral-500 mt-0.5">Pesanan ini telah dibatalkan dan tidak aktif.</p>
              </div>
            </div>

            <ExhaustedPlaybook
              v-if="order.status === 'pending' && (order.dispatch_status === 'exhausted' || order.dispatch_status === 'escalated')"
              :unit-name="order.unit_name"
              :requester-phone="order.requester_phone"
              :dispatch-status="order.dispatch_status"
              :escalation-hotline="order.escalation_hotline"
              :escalation-label="order.escalation_label"
              show-reassign
              show-escalate
              :escalating="acting === order.id"
              @reassign="showReassign = true"
              @escalate="doEscalate"
            />

            <!-- WA Status Update (ke pelapor) -->
            <div
              v-if="waStatusUrl"
              class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-4"
            >
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Update Pelapor</p>
              <a
                :href="waStatusUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <Icon icon="mdi:whatsapp" class="text-base" />
                {{ waStatusLabel }}
              </a>
              <p class="text-[11px] text-neutral-400 mt-2 text-center">Membuka WhatsApp dengan teks siap kirim</p>
            </div>

            <!-- WA Dispatch Link (ke unit yang tidak pakai dashboard) -->
            <div
              v-if="showDispatchCard"
              class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-4 space-y-3"
            >
              <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Link Respon Unit</p>

              <!-- Link belum di-generate -->
              <template v-if="!dispatchUrl">
                <p class="text-xs text-neutral-500 leading-snug">
                  Buat link agar unit dapat menerima atau menolak penugasan via WhatsApp — tanpa perlu login dashboard.
                </p>
                <button
                  type="button"
                  class="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  :disabled="generatingLink"
                  @click="generateDispatchLink"
                >
                  <Icon v-if="generatingLink" icon="lucide:loader-2" class="text-base animate-spin" />
                  <Icon v-else icon="lucide:link" class="text-base" />
                  {{ generatingLink ? "Membuat link…" : "Buat Link Respon" }}
                </button>
              </template>

              <!-- Link sudah ada -->
              <template v-else>
                <!-- URL display -->
                <div class="flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
                  <span class="text-xs text-neutral-600 truncate flex-1 font-mono">{{ dispatchUrl }}</span>
                  <button
                    type="button"
                    class="shrink-0 text-neutral-400 hover:text-neutral-700 transition-colors"
                    :title="linkCopied ? 'Tersalin!' : 'Salin link'"
                    @click="copyDispatchLink"
                  >
                    <Icon :icon="linkCopied ? 'lucide:check' : 'lucide:copy'" class="text-sm" />
                  </button>
                </div>

                <!-- Send via WA -->
                <a
                  :href="waDispatchUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  <Icon icon="mdi:whatsapp" class="text-base" />
                  Kirim ke Unit via WA
                </a>
                <p class="text-[11px] text-neutral-400 text-center">
                  Buka WA dengan pesan penugasan + link siap kirim
                </p>
              </template>
            </div>
          </aside>

          <section
            :class="[
              'lg:col-span-7 xl:col-span-8 space-y-4',
              mobilePane === 'steps' ? 'hidden lg:block' : 'block',
            ]"
          >
            <!-- Service/ETA meta only — unit name lives in header -->
            <div
              v-if="order.type_name || order.eta_minutes"
              class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-3 flex items-center gap-3"
            >
              <div class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Icon icon="mynaui:ambulance-solid" class="text-base" />
              </div>
              <p class="text-sm text-neutral-600 truncate min-w-0 flex-1">
                <span v-if="order.type_name">{{ order.type_name }}</span>
                <span v-if="order.type_name && order.eta_minutes"> · </span>
                <span v-if="order.eta_minutes">ETA ±{{ order.eta_minutes }} mnt</span>
              </p>
            </div>

            <OrderTimingStats :order="order" :history="historyItems" />

            <OrderIncidentDetailsCard
              :order="order"
              mode="admin"
              :history-items="historyItems"
              :history-loading="historyLoading"
              :related-feedback="relatedFeedback"
              :has-report="hasReport"
              :asset-url="assetUrl"
              :format-date="formatDate"
              :format-feedback-date="formatFeedbackDate"
              @lightbox="(url) => (lightboxPhoto = url)"
            />
          </section>
        </div>
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
            <Icon icon="lucide:x" class="text-white text-xl" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <ReassignModal
      v-model:open="showReassign"
      :order="order"
      mode="admin"
      @done="onReassignDone"
    />
    <RejectReasonModal
      v-model:open="showReject"
      :unit-name="order?.unit_name"
      @confirm="doRejectConfirm"
    />
    <UiModal
      v-model:open="showCancel"
      title="Batalkan kejadian?"
      description="Tiket akan ditutup sebagai dibatalkan. Pelapor tidak lagi menunggu unit."
    >
      <template #trigger><span /></template>
      <p class="text-sm text-neutral-600">
        Tiket
        <span class="font-mono font-semibold text-neutral-900">{{ order?.ticket_number }}</span>
        · {{ order?.requester_name || "Pelapor" }}
      </p>
      <template #footer>
        <UiButton variant="secondary" size="sm" :disabled="cancelling" @click="showCancel = false">Batal</UiButton>
        <UiButton variant="danger" size="sm" :loading="cancelling" @click="confirmCancel">
          <Icon icon="lucide:ban" class="text-sm" />
          Ya, batalkan
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
