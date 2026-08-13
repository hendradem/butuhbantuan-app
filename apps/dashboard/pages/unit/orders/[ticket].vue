<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: "unit", title: "Detail Pesanan" });

const route = useRoute();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;
const { unitHeaders } = useUnitAuth();

const ticketNumber = computed(() => String(route.params.ticket));

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return baseUrl + url;
}

const { data, pending, error, refresh: refreshOrder } = await useAsyncData(
  `unit-order-detail-${ticketNumber.value}`,
  () =>
    $fetch<{ data: any }>(`${baseUrl}/api/v1/order/ticket/${ticketNumber.value}`, {
      headers: unitHeaders(),
    }).then((r) => r.data),
  { server: false },
);

const refresh = useSoftRefresh(refreshOrder);
const order = computed(() => data.value ?? null);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

type MobilePane = "steps" | "detail";
const mobilePane = ref<MobilePane>("steps");

const TERMINAL = new Set(["completed", "cancelled"]);

watch(
  () => order.value?.status,
  (status) => {
    if (!status) return;
    mobilePane.value = status === "cancelled" ? "detail" : "steps";
  },
  { immediate: true },
);

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
watch(
  () => order.value?.status,
  (status) => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (import.meta.client && status && !TERMINAL.has(status)) {
      pollTimer = setInterval(() => refresh(), 15_000);
    }
  },
  { immediate: true },
);
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const lightboxPhoto = ref<string | null>(null);

const { accept, reject, acting } = useOrderDispatch("unit");
const showReassign = ref(false);
const showReject = ref(false);
const { items: historyItems, loading: historyLoading, load: loadHistory } = useOrderHistory("unit");

watch(
  () => order.value?.id,
  (id) => {
    if (id) loadHistory(order.value);
  },
  { immediate: true },
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

async function onReassignDone() {
  await refresh();
  loadHistory(order.value);
}

const updating = ref(false);
async function updateStatus(status: string, handlerName = "", notes = "") {
  if (!order.value?.id || updating.value) return;
  updating.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${order.value.id}`, {
      method: "PUT",
      headers: unitHeaders(),
      body: { status, handler_name: handlerName, handling_notes: notes },
    });
    toast.success("Status diperbarui");
    await refresh();
    loadHistory(order.value);
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal memperbarui status");
  } finally {
    updating.value = false;
  }
}

const showComplete = ref(false);
const completeHandler = ref("");
const completeNotes = ref("");

function openComplete() {
  completeHandler.value = order.value?.handler_name || "";
  completeNotes.value = order.value?.handling_notes || "";
  showComplete.value = true;
}

async function submitComplete() {
  await updateStatus("completed", completeHandler.value.trim(), completeNotes.value.trim());
  showComplete.value = false;
  if (order.value?.ticket_number) {
    await navigateTo(`/unit/reports?ticket=${order.value.ticket_number}`);
  }
}

async function doArrive() {
  if (!order.value?.id || updating.value) return;
  updating.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/orders/${order.value.id}/arrive`, {
      method: "POST",
      headers: unitHeaders(),
    });
    toast.success("Ditandai sudah sampai");
    await refresh();
    loadHistory(order.value);
  } catch (e: any) {
    toast.error(e?.data?.message || "Gagal menandai tiba");
  } finally {
    updating.value = false;
  }
}

async function doStart() {
  if (order.value?.status === "accepted") {
    await updateStatus("in_progress");
  }
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

const { data: feedbackData } = await useAsyncData(
  "unit-feedback-for-detail",
  () =>
    $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/feedback`, { headers: unitHeaders() })
      .then((r) => r.data ?? [])
      .catch(() => []),
  { server: false },
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
    case "start":
      await doStart();
      break;
    case "arrive":
      await doArrive();
      break;
    case "complete":
      openComplete();
      break;
    case "report":
      if (order.value?.ticket_number) {
        await navigateTo(`/unit/reports?ticket=${order.value.ticket_number}`);
      }
      break;
  }
}
</script>

<template>
  <div>
    <div class="page-subheader">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/unit/orders"
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
            <SlaCountdown
              v-if="order?.status === 'pending' && order?.sla_deadline"
              :deadline="order.sla_deadline"
              compact
            />
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

    <OrderDetailSkeleton v-if="showSkeleton" />

    <div v-else-if="error || !order" class="flex items-center justify-center p-12">
      <div class="text-center">
        <Icon icon="lucide:file-x" class="text-neutral-300 text-4xl mx-auto mb-3" />
        <p class="font-semibold text-neutral-700">Pesanan tidak ditemukan</p>
        <p class="text-sm text-neutral-400 mt-1">Nomor tiket tidak valid atau bukan milik unit Anda.</p>
        <NuxtLink
          to="/unit/orders"
          class="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium"
        >
          <Icon icon="lucide:arrow-left" class="text-sm" />
          Kembali ke Daftar Pesanan
        </NuxtLink>
      </div>
    </div>

    <div v-else class="p-4 sm:p-6 pb-24 lg:pb-6">
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
              mode="unit"
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
              @reassign="showReassign = true"
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
              mode="unit"
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

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lightboxPhoto"
          class="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          @click="lightboxPhoto = null"
        >
          <img :src="lightboxPhoto" class="max-w-full max-h-[85vh] rounded-xl object-contain" @click.stop>
          <button
            type="button"
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
      mode="unit"
      @done="onReassignDone"
    />
    <RejectReasonModal
      v-model:open="showReject"
      :unit-name="order?.unit_name"
      @confirm="doRejectConfirm"
    />

    <UiModal v-model:open="showComplete" title="Tandai Selesai">
      <template #trigger><span /></template>
      <div class="space-y-3 text-sm">
        <div>
          <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Petugas</label>
          <UiInput v-model="completeHandler" class="mt-1" placeholder="Nama petugas" />
        </div>
        <div>
          <label class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Catatan</label>
          <UiTextarea
            v-model="completeNotes"
            class="mt-1"
            :rows="3"
            placeholder="Ringkasan penanganan…"
          />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showComplete = false">Batal</UiButton>
        <UiButton size="sm" :loading="updating" @click="submitComplete">
          <Icon icon="lucide:check-circle" class="text-sm" />
          Selesaikan & buat laporan
        </UiButton>
      </template>
    </UiModal>
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
