<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { jenisPelayananLabel } from "@butuhbantuan/utils";

/**
 * Always-open incident detail card (Info | Riwayat | Selesai).
 * Matches order-detail right column layout.
 */
const props = defineProps<{
  order: any;
  mode: "admin" | "unit";
  historyItems?: any[] | null;
  historyLoading?: boolean;
  relatedFeedback?: any[];
  hasReport?: boolean;
  assetUrl: (url: string) => string;
  formatDate: (d: string | null | undefined) => string;
  formatFeedbackDate?: (d: string) => string;
}>();

const emit = defineEmits<{
  lightbox: [url: string];
}>();

type TabId = "info" | "history" | "after";

const tab = ref<TabId>("info");

const reportHref = computed(() =>
  props.mode === "unit"
    ? `/unit/reports?ticket=${props.order?.ticket_number}`
    : `/reports?ticket=${props.order?.ticket_number}`,
);

const feedbackHref = computed(() =>
  props.mode === "unit" ? "/unit/feedback" : "/feedback",
);

const isTerminal = computed(
  () => props.order?.status === "completed" || props.order?.status === "cancelled",
);

const feedback = computed(() => props.relatedFeedback ?? []);

const historyCount = computed(() => {
  const items = props.historyItems?.length
    ? props.historyItems
    : props.order?.history || [];
  return Array.isArray(items) ? items.length : 0;
});

const tabs = computed(() => {
  const list: { id: TabId; label: string; count?: number }[] = [
    { id: "info", label: "Info" },
    { id: "history", label: "Riwayat", count: historyCount.value || undefined },
  ];
  if (isTerminal.value) {
    list.push({ id: "after", label: "Selesai" });
  }
  return list;
});

watch(isTerminal, (v) => {
  if (!v && tab.value === "after") tab.value = "info";
});

const summaryLine = computed(() => props.order?.location || props.order?.requester_name || "");

const hasValidCoords = computed(() => {
  const lat = Number(props.order?.requester_lat);
  const lng = Number(props.order?.requester_lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
});

const hasFieldGps = computed(() => {
  const lat = Number(props.order?.responder_lat);
  const lng = Number(props.order?.responder_lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
});

const showFieldLiveMap = computed(() => {
  const s = props.order?.status;
  if (s !== "accepted" && s !== "in_progress") return false;
  return hasFieldGps.value;
});

const mapsUrl = computed(() => {
  if (!hasValidCoords.value) return "";
  const lat = Number(props.order.requester_lat);
  const lng = Number(props.order.requester_lng);
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const coordsLabel = computed(() => {
  if (!hasValidCoords.value) return "";
  const lat = Number(props.order.requester_lat);
  const lng = Number(props.order.requester_lng);
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
});

const telUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  return `tel:${raw}`;
});

const waUrl = computed(() => {
  const raw = String(props.order?.requester_phone || "").replace(/\D/g, "");
  if (!raw) return "";
  let digits = raw;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  const name = props.order?.requester_name || "Pelapor";
  const ticket = props.order?.ticket_number || "";
  const loc = props.order?.location || "";
  const maps = mapsUrl.value;
  const text = [
    `Halo ${name}, kami dari unit darurat terkait tiket ${ticket}.`,
    loc ? `Lokasi: ${loc}` : null,
    maps ? `Maps: ${maps}` : null,
    "Mohon tetap di tempat yang aman.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const metaRows = computed(() => {
  const o = props.order;
  const rows: { label: string; value: string }[] = [
    { label: "Unit", value: o?.unit_name || "—" },
    { label: "Sumber", value: o?.source === "sos" ? "SOS" : "Panggilan" },
    { label: "Dibuat", value: props.formatDate(o?.created_at) },
  ];
  if (o?.accepted_at) rows.push({ label: "Diterima", value: props.formatDate(o.accepted_at) });
  if (o?.arrived_at) rows.push({ label: "Tiba", value: props.formatDate(o.arrived_at) });
  if (o?.completed_at) rows.push({ label: "Selesai", value: props.formatDate(o.completed_at) });
  return rows;
});

const hasAssessment = computed(() => {
  const a = props.order?.assessment;
  return !!(a?.answers?.length || a?.notes || a?.acuity || props.order?.assessment_acuity);
});
</script>

<template>
  <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
    <div class="px-4 sm:px-5 py-3.5 border-b border-neutral-100">
      <p class="text-sm font-semibold text-neutral-900">Detail kejadian</p>
      <p class="text-sm text-neutral-500 mt-0.5 truncate">{{ summaryLine }}</p>
    </div>

    <!-- Underline tabs -->
    <div class="px-4 sm:px-5 flex gap-1 border-b border-neutral-100">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        :class="[
          'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
          tab === t.id
            ? 'border-neutral-900 text-neutral-900'
            : 'border-transparent text-neutral-400 hover:text-neutral-700',
        ]"
        @click="tab = t.id"
      >
        {{ t.label }}
        <span v-if="t.count" class="ml-1 text-xs text-neutral-400">{{ t.count }}</span>
      </button>
    </div>

    <!-- Info -->
    <div v-if="tab === 'info'">
      <div class="px-4 sm:px-5 py-4 space-y-0 divide-y divide-neutral-100">
        <!-- Pelapor + Kontak cepat -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          <div>
            <p class="text-xs font-medium text-neutral-400">Pelapor</p>
            <p class="mt-1 text-sm font-medium text-neutral-900">
              {{ order.requester_name || "—" }}
            </p>
            <p class="text-sm text-neutral-500">{{ order.requester_phone || "—" }}</p>
          </div>
          <div v-if="order.requester_phone">
            <p class="text-xs font-medium text-neutral-400">Kontak cepat</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <a
                v-if="telUrl"
                :href="telUrl"
                class="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Icon icon="lucide:phone" class="text-sm" />
                Telepon
              </a>
              <a
                v-if="waUrl"
                :href="waUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
              >
                <Icon icon="mdi:whatsapp" class="text-sm" />
                WA
              </a>
            </div>
          </div>
        </div>

        <div v-if="order.jenis_pelayanan" class="pb-4">
          <p class="text-xs font-medium text-neutral-400">Jenis pelayanan</p>
          <p class="mt-1 text-sm font-medium text-neutral-900">
            {{ jenisPelayananLabel(order.jenis_pelayanan) }}
          </p>
        </div>

        <!-- Asesmen awal / kondisi -->
        <div v-if="hasAssessment || order.condition" class="py-4">
          <div class="rounded-xl border border-neutral-100 bg-neutral-50/70 px-3.5 py-3">
            <OrderAssessmentBlock
              :assessment="order.assessment"
              :acuity="order.assessment_acuity"
              :condition="order.condition"
            />
          </div>
        </div>

        <!-- Lokasi + map -->
        <div v-if="order.location || hasValidCoords" class="py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-medium text-neutral-400">Lokasi</p>
              <p v-if="order.location" class="mt-1.5 text-sm text-neutral-800 leading-relaxed">
                {{ order.location }}
              </p>
              <p v-if="coordsLabel" class="mt-1 text-xs font-mono text-neutral-400">
                {{ coordsLabel }}
              </p>
            </div>
            <a
              v-if="mapsUrl"
              :href="mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Icon icon="lucide:navigation" class="text-sm" />
              Maps
            </a>
          </div>

          <div v-if="showFieldLiveMap" class="mt-3">
            <OrderFieldLiveMap
              :requester-lat="order.requester_lat"
              :requester-lng="order.requester_lng"
              :responder-lat="order.responder_lat"
              :responder-lng="order.responder_lng"
              :updated-at="order.responder_updated_at"
              :arrived-at="order.arrived_at"
            />
          </div>
          <div v-else-if="hasValidCoords" class="mt-3">
            <OrderLocationMap
              :lat="Number(order.requester_lat)"
              :lng="Number(order.requester_lng)"
              :label="order.location"
              :show-link="false"
            />
          </div>
          <div
            v-else
            class="mt-3 h-44 sm:h-52 rounded-lg border border-neutral-200 bg-neutral-100 relative overflow-hidden"
          >
            <div
              class="absolute inset-0 opacity-40"
              style="background-image: radial-gradient(#a3a3a3 1px, transparent 1px); background-size: 14px 14px;"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="flex flex-col items-center gap-2">
                <div class="w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                  <Icon icon="lucide:map-pin" class="text-emergency-600 text-base" />
                </div>
                <p class="text-[11px] text-neutral-500">Peta lokasi pelapor</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Foto -->
        <div v-if="order.photo_url" class="py-4">
          <p class="text-xs font-medium text-neutral-400 mb-2">Foto laporan</p>
          <img
            :src="assetUrl(order.photo_url)"
            alt="Foto laporan"
            class="w-full max-w-xs aspect-[4/3] rounded-lg object-cover cursor-zoom-in border border-neutral-200"
            @click="emit('lightbox', assetUrl(order.photo_url))"
          >
        </div>

        <!-- Meta rows -->
        <div class="py-4">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div v-for="row in metaRows" :key="row.label">
              <dt class="text-xs font-medium text-neutral-400">{{ row.label }}</dt>
              <dd class="mt-0.5 text-sm font-medium text-neutral-900">{{ row.value }}</dd>
            </div>
          </dl>
        </div>

        <!-- Handler notes + referral -->
        <div
          v-if="order.handler_name || order.handling_notes || order.referral_hospital_name"
          class="pt-4 space-y-3"
        >
          <div v-if="order.handler_name">
            <p class="text-xs font-medium text-neutral-400">Petugas</p>
            <p class="mt-0.5 text-sm font-medium text-neutral-900">{{ order.handler_name }}</p>
          </div>
          <div v-if="order.handling_notes">
            <p class="text-xs font-medium text-neutral-400">Catatan penanganan</p>
            <p class="mt-0.5 text-sm text-neutral-700 leading-relaxed">{{ order.handling_notes }}</p>
          </div>
          <div v-if="order.referral_hospital_name">
            <p class="text-xs font-medium text-neutral-400">RS Rujukan</p>
            <p class="mt-0.5 text-sm font-medium text-neutral-900 flex items-center gap-1.5">
              <Icon icon="lucide:hospital" class="text-neutral-400 shrink-0" />
              {{ order.referral_hospital_name }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Riwayat -->
    <div v-else-if="tab === 'history'" class="px-4 sm:px-5 py-4">
      <OrderHistoryTimeline
        hide-title
        variant="plain"
        :items="(historyItems?.length ? historyItems : order.history) || []"
        :loading="historyLoading"
      />
    </div>

    <!-- Selesai -->
    <div v-else-if="tab === 'after'" class="px-4 sm:px-5 py-4 space-y-3">
      <NuxtLink
        :to="reportHref"
        class="flex items-center gap-3 w-full px-3.5 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
      >
        <Icon icon="lucide:file-text" class="text-neutral-500 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-neutral-900">
            {{ hasReport ? "Lihat / edit laporan" : "Buat laporan kejadian" }}
          </p>
          <p class="text-sm text-neutral-500">
            {{ hasReport ? "Laporan sudah ada" : "Ringkas penanganan untuk arsip" }}
          </p>
        </div>
        <Icon icon="lucide:chevron-right" class="text-neutral-400 shrink-0" />
      </NuxtLink>

      <div class="rounded-lg border border-neutral-200 bg-neutral-50/60 px-3.5 py-3">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-sm font-medium text-neutral-700">Feedback warga</p>
          <NuxtLink
            :to="feedbackHref"
            class="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Arsip
          </NuxtLink>
        </div>
        <div v-if="!feedback.length" class="text-sm text-neutral-400 py-1">
          Belum ada feedback di periode tiket ini.
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="fb in feedback.slice(0, 3)"
            :key="fb.id"
            class="rounded-lg bg-white border border-neutral-100 px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                :class="[
                  'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full',
                  fb.unit_helpful ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600',
                ]"
              >
                <Icon
                  :icon="fb.unit_helpful ? 'lucide:thumbs-up' : 'lucide:thumbs-down'"
                  class="text-[10px]"
                />
                {{ fb.unit_helpful ? "Membantu" : "Tidak membantu" }}
              </span>
              <span v-if="formatFeedbackDate" class="text-xs text-neutral-400">
                {{ formatFeedbackDate(fb.created_at) }}
              </span>
            </div>
            <p v-if="fb.comment" class="text-sm text-neutral-600 mt-1.5 leading-snug line-clamp-3">
              "{{ fb.comment }}"
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
