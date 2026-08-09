<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: false });

const route = useRoute();
const config = useRuntimeConfig();

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

// Contact info from query params (set by OrderFormSheet after submit)
const via = computed(() => (route.query.via as string) || "");
const to = computed(() => (route.query.to as string) || "");

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
    t.location ? `🗺️ *Alamat:* ${t.location}` : null,
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

// ── Review form ────────────────────────────────────────────────────────────────
const unitHelpful = ref<boolean | null>(null);
const appHelpful = ref<boolean | null>(null);
const reviewComment = ref("");
const submittingReview = ref(false);
const reviewSubmitted = ref(false);

const reviewStorageKey = computed(() => `bb-reviewed-${route.params.number}`);

onMounted(() => {
  if (localStorage.getItem(reviewStorageKey.value)) {
    reviewSubmitted.value = true;
  }
});

async function submitReview() {
  if (!ticket.value || unitHelpful.value === null) return;
  submittingReview.value = true;
  try {
    await $fetch(`${config.public.apiBaseUrl}/api/v1/feedback/`, {
      method: "POST",
      body: {
        emergency_id: ticket.value.emergency_uuid,
        unit_name: ticket.value.unit_name,
        unit_helpful: unitHelpful.value,
        app_helpful: appHelpful.value,
        call_type: via.value || "unknown",
        comment: reviewComment.value.trim(),
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

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  in_progress: "Sedang Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-orange-100 text-orange-700 border-orange-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
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

    <div class="flex flex-col items-center py-6 px-4">
      <div class="w-full max-w-sm space-y-4">

        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center py-16 gap-2 text-neutral-400 text-sm">
          <div class="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          Memuat tiket...
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
            <div class="bg-red-600 px-5 py-4 text-white">
              <p class="text-xs font-medium opacity-80 uppercase tracking-wide mb-1">Nomor Tiket</p>
              <p class="text-2xl font-bold tracking-widest">{{ ticket.ticket_number }}</p>
              <div class="mt-2 flex items-center justify-between">
                <span :class="['inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border', STATUS_COLOR[ticket.status] ?? 'bg-white/20 text-white border-white/30']">
                  {{ STATUS_LABEL[ticket.status] ?? ticket.status }}
                </span>
                <button class="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors" @click="refresh()">
                  <Icon icon="lucide:refresh-cw" class="text-xs" />
                  Perbarui
                </button>
              </div>
            </div>

            <div class="divide-y divide-neutral-100">
              <!-- Unit -->
              <div class="px-5 py-3.5">
                <p class="text-xs text-neutral-400 mb-0.5">Unit Layanan</p>
                <p class="text-sm font-semibold text-neutral-900">{{ ticket.unit_name || "—" }}</p>
              </div>

              <!-- Requester -->
              <div class="px-5 py-3.5 grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs text-neutral-400 mb-0.5">Nama Pelapor</p>
                  <p class="text-sm font-medium text-neutral-900">{{ ticket.requester_name }}</p>
                </div>
                <div>
                  <p class="text-xs text-neutral-400 mb-0.5">No. HP</p>
                  <p class="text-sm font-medium text-neutral-900">{{ ticket.requester_phone }}</p>
                </div>
              </div>

              <!-- Location -->
              <div v-if="ticket.location" class="px-5 py-3.5">
                <p class="text-xs text-neutral-400 mb-0.5">Lokasi Kejadian</p>
                <p class="text-sm text-neutral-900 leading-relaxed">{{ ticket.location }}</p>
              </div>

              <!-- Condition -->
              <div v-if="ticket.condition" class="px-5 py-3.5">
                <p class="text-xs text-neutral-400 mb-0.5">Kondisi / Keluhan</p>
                <p class="text-sm text-neutral-900 leading-relaxed">{{ ticket.condition }}</p>
              </div>

              <!-- Handler info -->
              <template v-if="ticket.handler_name || ticket.handling_notes">
                <div class="px-5 py-3.5 bg-green-50">
                  <p class="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Informasi Penanganan</p>
                  <div v-if="ticket.handler_name" class="mb-1.5">
                    <p class="text-xs text-green-600 mb-0.5">Petugas</p>
                    <p class="text-sm font-medium text-green-900">{{ ticket.handler_name }}</p>
                  </div>
                  <div v-if="ticket.handling_notes">
                    <p class="text-xs text-green-600 mb-0.5">Catatan Penanganan</p>
                    <p class="text-sm text-green-900 leading-relaxed">{{ ticket.handling_notes }}</p>
                  </div>
                </div>
              </template>

              <!-- Timestamps -->
              <div class="px-5 py-3.5 grid grid-cols-2 gap-3">
                <div>
                  <p class="text-xs text-neutral-400 mb-0.5">Dibuat</p>
                  <p class="text-xs text-neutral-700">{{ formatDate(ticket.created_at) }}</p>
                </div>
                <div v-if="ticket.completed_at">
                  <p class="text-xs text-neutral-400 mb-0.5">Selesai</p>
                  <p class="text-xs text-neutral-700">{{ formatDate(ticket.completed_at) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact button -->
          <div v-if="waUrl || phoneUrl">
            <a
              v-if="waUrl"
              :href="waUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-green-500 text-white font-semibold text-sm shadow-sm hover:bg-green-600 active:scale-95 transition-all"
            >
              <Icon icon="mdi:whatsapp" class="text-xl" />
              Hubungi via WhatsApp
            </a>
            <a
              v-else-if="phoneUrl"
              :href="phoneUrl"
              class="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-blue-500 text-white font-semibold text-sm shadow-sm hover:bg-blue-600 active:scale-95 transition-all"
            >
              <Icon icon="mdi:phone" class="text-xl" />
              Hubungi via Telepon
            </a>
          </div>

          <!-- Review section — only when completed -->
          <div v-if="ticket.status === 'completed'" class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-neutral-100">
              <p class="text-sm font-semibold text-neutral-800">Beri Penilaian</p>
              <p class="text-xs text-neutral-400 mt-0.5">Bantu kami berkembang dengan penilaianmu.</p>
            </div>

            <!-- Success state -->
            <div v-if="reviewSubmitted" class="flex flex-col items-center justify-center py-8 gap-3 text-center px-5">
              <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Icon icon="lucide:check-circle" class="text-green-500 text-2xl" />
              </div>
              <p class="font-semibold text-neutral-800">Terima kasih!</p>
              <p class="text-sm text-neutral-500">Penilaianmu membantu kami berkembang.</p>
            </div>

            <!-- Review form -->
            <div v-else class="px-5 py-4 space-y-4">
              <!-- Unit helpful -->
              <div>
                <p class="text-sm font-medium text-neutral-700 mb-2">
                  Apakah <span class="font-semibold text-neutral-900">{{ ticket.unit_name || 'unit ini' }}</span> membantu?
                </p>
                <div class="flex gap-2">
                  <button
                    :class="[
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      unitHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 bg-white text-neutral-600',
                    ]"
                    @click="unitHelpful = true"
                  >
                    <Icon icon="lucide:thumbs-up" class="text-base" />
                    Ya
                  </button>
                  <button
                    :class="[
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      unitHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 bg-white text-neutral-600',
                    ]"
                    @click="unitHelpful = false"
                  >
                    <Icon icon="lucide:thumbs-down" class="text-base" />
                    Tidak
                  </button>
                </div>
              </div>

              <!-- App helpful -->
              <div>
                <p class="text-sm font-medium text-neutral-700 mb-2">Apakah aplikasi ini berguna?</p>
                <div class="flex gap-2">
                  <button
                    :class="[
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      appHelpful === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 bg-white text-neutral-600',
                    ]"
                    @click="appHelpful = true"
                  >
                    <Icon icon="lucide:smile" class="text-sm" />
                    Ya
                  </button>
                  <button
                    :class="[
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      appHelpful === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-neutral-200 bg-white text-neutral-600',
                    ]"
                    @click="appHelpful = false"
                  >
                    <Icon icon="lucide:frown" class="text-sm" />
                    Tidak
                  </button>
                  <button
                    :class="[
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                      appHelpful === null ? 'border-neutral-300 bg-neutral-50 text-neutral-500' : 'border-neutral-200 bg-white text-neutral-600',
                    ]"
                    @click="appHelpful = null"
                  >
                    <Icon icon="lucide:meh" class="text-sm" />
                    Biasa
                  </button>
                </div>
              </div>

              <!-- Comment -->
              <div>
                <label class="text-sm font-medium text-neutral-700 block mb-1.5">
                  Komentar <span class="text-neutral-400 font-normal text-xs">(opsional)</span>
                </label>
                <textarea
                  v-model="reviewComment"
                  rows="3"
                  maxlength="500"
                  placeholder="Ceritakan pengalamanmu..."
                  class="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white resize-none transition-colors"
                />
                <p class="text-right text-xs text-neutral-300 mt-1">{{ reviewComment.length }}/500</p>
              </div>

              <button
                :disabled="unitHelpful === null || submittingReview"
                class="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
                @click="submitReview"
              >
                <Icon v-if="submittingReview" icon="lucide:loader-2" class="animate-spin text-base" />
                <template v-else>
                  <Icon icon="lucide:send" class="text-sm" />
                  Kirim Penilaian
                </template>
              </button>
            </div>
          </div>

          <p class="text-center text-xs text-neutral-400">
            ButuhBantuan &copy; {{ new Date().getFullYear() }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
