<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ title: "Detail Pesanan" });

const route = useRoute();
const { get, authGet, baseUrl } = useApi();

const ticketNumber = computed(() => String(route.params.ticket));

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseUrl + url;
}

const { data, pending, error, refresh: refreshOrder } = await useAsyncData(
  `order-detail-${ticketNumber.value}`,
  () => get<{ data: any }>(`/api/v1/order/ticket/${ticketNumber.value}`).then(r => r.data),
  { server: false }
);

const refresh = useSoftRefresh(refreshOrder);
const order = computed(() => data.value ?? null);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

type MobilePane = "steps" | "detail";
const mobilePane = ref<MobilePane>("steps");

// ── Helpers ───────────────────────────────────────────────────────────────────
const TERMINAL = new Set(["completed", "cancelled"]);

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

// Auto refresh while active
let pollTimer: ReturnType<typeof setInterval> | null = null;
watch(
  () => order.value?.status,
  (status) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (import.meta.client && status && !TERMINAL.has(status)) {
      pollTimer = setInterval(() => refresh(), 15_000);
    }
  },
  { immediate: true }
);
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

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
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/orders"
          class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
        >
          <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
        </NuxtLink>
        <div class="page-subheader-meta">
          <div class="page-subheader-row">
            <h1 class="page-subheader-title font-mono">{{ ticketNumber }}</h1>
            <UiStatusBadge v-if="order" :status="order.status" />
            <span
              v-else-if="showSkeleton"
              class="soft-skel inline-block h-5 w-16 rounded-full shrink-0"
              aria-hidden="true"
            />
            <span
              v-if="order?.source === 'sos'"
              class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emergency-600 text-white uppercase animate-pulse"
            >
              <Icon icon="lucide:siren" class="text-[10px]" />
              SOS
            </span>
          </div>
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
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors ml-auto shrink-0"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" class="text-xs" :class="{ 'animate-spin': pending }" />
          Refresh
        </button>
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
        <NuxtLink to="/orders" class="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium">
          <Icon icon="lucide:arrow-left" class="text-sm" />
          Kembali ke Daftar Pesanan
        </NuxtLink>
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
          </aside>

          <section
            :class="[
              'lg:col-span-7 xl:col-span-8 space-y-4',
              mobilePane === 'steps' ? 'hidden lg:block' : 'block',
            ]"
          >
            <!-- Unit strip -->
            <div
              v-if="order.unit_name"
              class="bg-white rounded-xl border border-neutral-200 px-4 sm:px-5 py-3.5 flex items-center gap-3"
            >
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Icon icon="mynaui:ambulance-solid" class="text-xl" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-neutral-900 truncate">{{ order.unit_name }}</p>
                <p class="text-xs text-neutral-500 mt-0.5 truncate">
                  <template v-if="order.type_name || order.eta_minutes">
                    <span v-if="order.type_name">{{ order.type_name }}</span>
                    <span v-if="order.type_name && order.eta_minutes"> · </span>
                    <span v-if="order.eta_minutes">ETA ±{{ order.eta_minutes }} mnt</span>
                  </template>
                  <template v-else>Unit penanganan</template>
                </p>
              </div>
              <span
                v-if="order.partner_tier === 'psc' || order.partner_tier === 'verified'"
                class="hidden sm:inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800"
              >
                {{ order.partner_tier === 'psc' ? 'PSC' : 'Terverifikasi' }}
              </span>
            </div>

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
