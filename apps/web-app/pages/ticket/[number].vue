<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;

function assetUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return apiBase + url;
}

const coreSheet = useCoreSheetStore();
const orderSheet = useOrderSheetStore();
const confirmationSheet = useConfirmationSheetStore();
const reviewSheet = useReviewSheetStore();
const searchSheet = useSearchSheetStore();
const exploreSheet = useExploreSheetStore();
const detailSheet = useDetailSheetStore();

function goHome() {
  coreSheet.onClose();
  orderSheet.onClose();
  confirmationSheet.onClose();
  reviewSheet.onClose();
  searchSheet.onClose();
  exploreSheet.onClose();
  detailSheet.onClose();
  navigateTo("/");
}

const { data, pending, error, refresh } = await useAsyncData(`ticket-${route.params.number}`, () =>
  $fetch<{ data: any }>(`${config.public.apiBaseUrl}/api/v1/order/ticket/${route.params.number}`)
    .catch(() => null)
);

const ticket = computed(() => data.value?.data ?? null);

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

// ── Review ─────────────────────────────────────────────────────────────────────
const unitHelpful      = ref<boolean | null>(null);
const appHelpful       = ref<boolean | null>(null);
const reviewComment    = ref("");
const submittingReview = ref(false);
const reviewSubmitted  = ref(false);
const reviewStorageKey = computed(() => `bb-reviewed-${route.params.number}`);

onMounted(() => {
  if (localStorage.getItem(reviewStorageKey.value)) reviewSubmitted.value = true;
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
  pending:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted:    "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-orange-100 text-orange-700 border-orange-200",
  completed:   "bg-green-100 text-green-700 border-green-200",
  cancelled:   "bg-neutral-100 text-neutral-500 border-neutral-200",
};

// ── Live polling ───────────────────────────────────────────────────────────────
const TERMINAL = new Set(["completed", "cancelled"]);
let pollTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => ticket.value?.status,
  (status) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (import.meta.client && status && !TERMINAL.has(status)) {
      pollTimer = setInterval(() => refresh(), 10_000);
    }
  },
  { immediate: true }
);
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

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
  <div class="min-h-screen bg-neutral-50">
    <!-- Top bar -->
    <div class="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-3">
      <button class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" @click="goHome">
        <Icon icon="lucide:arrow-left" class="text-neutral-700 text-base" />
      </button>
      <span class="text-sm font-semibold text-neutral-800">E-Tiket Darurat</span>
    </div>

    <div class="flex flex-col items-center py-4 px-4">
      <div class="w-full max-w-sm space-y-3">

        <!-- Skeleton -->
        <div v-if="pending" class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden animate-pulse">
          <div class="bg-neutral-200 h-16" />
          <div class="px-4 py-3 space-y-2.5">
            <div class="h-3 bg-neutral-200 rounded w-1/3" />
            <div class="h-3 bg-neutral-100 rounded w-2/3" />
            <div class="h-3 bg-neutral-100 rounded w-1/2" />
            <div class="h-3 bg-neutral-100 rounded w-3/4" />
          </div>
        </div>

        <!-- Not found -->
        <div v-else-if="error || !ticket" class="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center">
          <Icon icon="lucide:file-x" class="text-neutral-300 text-4xl mx-auto mb-3" />
          <p class="font-semibold text-neutral-700">Tiket tidak ditemukan</p>
          <p class="text-sm text-neutral-400 mt-1">Nomor tiket tidak valid atau sudah kedaluwarsa.</p>
          <NuxtLink to="/" class="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium">
            <Icon icon="lucide:home" class="text-sm" />
            Kembali ke Aplikasi
          </NuxtLink>
        </div>

        <!-- Ticket card -->
        <template v-else>
          <div class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">

            <!-- Header -->
            <div class="bg-red-600 px-4 py-3 text-white flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[10px] font-medium opacity-70 uppercase tracking-wider">Nomor Tiket</p>
                <p class="text-lg font-bold tracking-widest leading-tight">{{ ticket.ticket_number }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                <span :class="['inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLOR[ticket.status] ?? 'bg-white/20 text-white border-white/20']">
                  {{ STATUS_LABEL[ticket.status] ?? ticket.status }}
                </span>
                <button class="flex items-center gap-1 text-[10px] text-white/60 hover:text-white transition-colors" @click="refresh()">
                  <Icon icon="lucide:refresh-cw" :class="['text-[10px]', !TERMINAL.has(ticket.status) && 'animate-spin']" />
                  {{ TERMINAL.has(ticket.status) ? 'Refresh' : 'Live' }}
                </button>
              </div>
            </div>

            <!-- Stepper -->
            <div v-if="ticket.status !== 'cancelled'" class="px-3 pt-3 pb-2">
              <div class="flex items-start">
                <template v-for="(step, i) in steps" :key="step.key">
                  <component
                    :is="isClickable(step.key) ? 'button' : 'div'"
                    :type="isClickable(step.key) ? 'button' : undefined"
                    class="flex flex-col items-center flex-none"
                    :class="isClickable(step.key) ? 'cursor-pointer active:opacity-60' : 'cursor-default'"
                    style="width: 48px"
                    @click="onStepClick(step.key)"
                  >
                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center transition-all', stepCircleClass(step.key), stepRing(step.key)]">
                      <Icon :icon="step.icon" class="text-white text-xs" />
                    </div>
                    <p :class="['text-[9px] mt-1 text-center leading-tight transition-colors', stepLabelClass(step.key)]">
                      {{ step.label }}
                    </p>
                  </component>
                  <div v-if="i < steps.length - 1" :class="['flex-1 h-0.5 mt-3.5 transition-colors', stepConnectorClass(step.key)]" />
                </template>
              </div>
              <p v-if="ticket.status === 'completed'" class="text-[9px] text-neutral-400 text-center mt-1.5">
                Ketuk <b>Selesai</b> atau <b>Penilaian</b> untuk berpindah
              </p>
            </div>

            <div class="border-t border-neutral-100" />

            <!-- ── VIEW: Ticket ── -->
            <template v-if="activeView === 'ticket'">
              <div class="divide-y divide-neutral-100 text-xs">

                <!-- Unit + timestamp -->
                <div class="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-neutral-400">Unit Layanan</p>
                    <p class="font-semibold text-neutral-900 mt-0.5 text-sm truncate">{{ ticket.unit_name || "—" }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-neutral-400">{{ ticket.completed_at ? 'Selesai' : 'Dibuat' }}</p>
                    <p class="text-neutral-600 mt-0.5">{{ formatDate(ticket.completed_at ?? ticket.created_at) }}</p>
                  </div>
                </div>

                <!-- Requester -->
                <div class="px-4 py-2.5 grid grid-cols-2 gap-2">
                  <div>
                    <p class="text-neutral-400">Pelapor</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_name }}</p>
                  </div>
                  <div>
                    <p class="text-neutral-400">No. HP</p>
                    <p class="font-medium text-neutral-900 mt-0.5">{{ ticket.requester_phone }}</p>
                  </div>
                </div>

                <!-- Location + Condition -->
                <div v-if="ticket.location || ticket.condition" class="px-4 py-2.5 space-y-1.5">
                  <div v-if="ticket.location" class="flex items-start gap-1.5 text-neutral-600">
                    <Icon icon="lucide:map-pin" class="shrink-0 mt-0.5 text-neutral-400" />
                    <span class="leading-snug">{{ ticket.location }}</span>
                  </div>
                  <div v-if="ticket.condition" class="flex items-start gap-1.5 text-neutral-600">
                    <Icon icon="lucide:activity" class="shrink-0 mt-0.5 text-neutral-400" />
                    <span class="leading-snug">{{ ticket.condition }}</span>
                  </div>
                </div>

                <!-- Photo button -->
                <div v-if="ticket.photo_url" class="px-4 py-2.5">
                  <button
                    class="inline-flex items-center gap-1.5 font-medium text-primary-600 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 active:bg-primary-200 transition-colors"
                    @click="lightboxPhoto = assetUrl(ticket.photo_url)"
                  >
                    <Icon icon="lucide:camera" class="text-sm" />
                    Lihat Foto Kondisi
                  </button>
                </div>

                <!-- Handler info -->
                <div v-if="ticket.handler_name || ticket.handling_notes" class="px-4 py-2.5 bg-green-50">
                  <p class="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Penanganan</p>
                  <p v-if="ticket.handler_name" class="text-neutral-800">
                    <span class="text-green-600">Petugas:</span> {{ ticket.handler_name }}
                  </p>
                  <p v-if="ticket.handling_notes" class="text-neutral-800 mt-0.5">
                    <span class="text-green-600">Catatan:</span> {{ ticket.handling_notes }}
                  </p>
                </div>

                <!-- CTA review -->
                <div v-if="ticket.status === 'completed' && !reviewSubmitted" class="px-4 py-2.5">
                  <button
                    class="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-neutral-200 text-neutral-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
                    @click="activeView = 'review'"
                  >
                    <Icon icon="lucide:star" class="text-sm" />
                    Beri Penilaian
                  </button>
                </div>
              </div>
            </template>

            <!-- ── VIEW: Review ── -->
            <template v-else>
              <!-- Success -->
              <div v-if="reviewSubmitted" class="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
                <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <Icon icon="lucide:check-circle" class="text-green-500 text-2xl" />
                </div>
                <p class="font-semibold text-neutral-800 text-sm">Terima kasih!</p>
                <p class="text-xs text-neutral-500">Penilaianmu membantu kami berkembang.</p>
                <button class="text-xs text-primary-600 font-medium mt-1" @click="activeView = 'ticket'">
                  Lihat detail tiket
                </button>
              </div>

              <!-- Form -->
              <div v-else class="px-4 py-3 space-y-3">
                <div>
                  <p class="text-sm font-semibold text-neutral-800">Beri Penilaian</p>
                  <p class="text-xs text-neutral-400">Bantu kami berkembang dengan penilaianmu.</p>
                </div>

                <div>
                  <p class="text-xs font-medium text-neutral-700 mb-1.5">
                    Apakah <span class="font-semibold">{{ ticket.unit_name || 'unit ini' }}</span> membantu?
                  </p>
                  <div class="flex gap-2">
                    <button :class="['flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-medium transition-all', unitHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600']" @click="unitHelpful = true">
                      <Icon icon="lucide:thumbs-up" /> Ya
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-medium transition-all', unitHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600']" @click="unitHelpful = false">
                      <Icon icon="lucide:thumbs-down" /> Tidak
                    </button>
                  </div>
                </div>

                <div>
                  <p class="text-xs font-medium text-neutral-700 mb-1.5">Apakah aplikasi ini berguna?</p>
                  <div class="flex gap-2">
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all', appHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = true">
                      <Icon icon="lucide:smile" /> Ya
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all', appHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = false">
                      <Icon icon="lucide:frown" /> Tidak
                    </button>
                    <button :class="['flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all', appHelpful === null ? 'border-neutral-300 bg-neutral-50 text-neutral-500' : 'border-neutral-200 text-neutral-600']" @click="appHelpful = null">
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
                    class="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-none transition-colors"
                  />
                </div>

                <button
                  :disabled="unitHelpful === null || submittingReview"
                  class="w-full py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  @click="submitReview"
                >
                  <Icon v-if="submittingReview" icon="lucide:loader-2" class="animate-spin text-sm" />
                  <template v-else>
                    <Icon icon="lucide:send" class="text-xs" />
                    Kirim Penilaian
                  </template>
                </button>

                <button class="w-full text-xs text-neutral-400 py-1" @click="activeView = 'ticket'">
                  Kembali ke detail tiket
                </button>
              </div>
            </template>
          </div>

          <!-- Push notification opt-in (only while ticket is active) -->
          <div v-if="pushSupported && !TERMINAL.has(ticket.status)">
            <button
              v-if="!pushSubscribed"
              :disabled="pushLoading"
              class="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-neutral-800 text-white text-sm font-medium shadow-sm active:scale-95 transition-all disabled:opacity-50"
              @click="pushSubscribe"
            >
              <Icon v-if="pushLoading" icon="lucide:loader-2" class="animate-spin text-sm" />
              <Icon v-else icon="lucide:bell" class="text-sm" />
              {{ pushLoading ? 'Mengaktifkan...' : 'Aktifkan Notifikasi' }}
            </button>
            <button
              v-else
              class="flex items-center justify-center gap-2 w-full py-2 rounded-2xl border border-neutral-200 text-neutral-500 text-xs"
              @click="pushUnsubscribe"
            >
              <Icon icon="lucide:bell-off" class="text-xs" />
              Nonaktifkan Notifikasi
            </button>
          </div>

          <!-- Contact button -->
          <div v-if="waUrl || phoneUrl">
            <a v-if="waUrl" :href="waUrl" target="_blank" rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all">
              <Icon icon="mdi:whatsapp" class="text-lg" />
              Hubungi via WhatsApp
            </a>
            <a v-else-if="phoneUrl" :href="phoneUrl"
              class="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all">
              <Icon icon="mdi:phone" class="text-lg" />
              Hubungi via Telepon
            </a>
          </div>

          <p class="text-center text-[10px] text-neutral-400">
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
