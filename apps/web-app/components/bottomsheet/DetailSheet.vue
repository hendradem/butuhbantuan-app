<script setup lang="ts">
/**
 * Emergency-unit detail sheet — Google-Maps-style layout.
 *
 * Snap points (draggable): peek 260px · half 0.7vh · full 0.92vh.
 *
 * Layout:
 *   [ handle ]
 *   [ header ] — icon + title + subtitle + meta chips + close
 *   [ tabs   ] — Detail · Reviews · About
 *   ───────── scrollable body ─────────
 *   [ Perhatian penting card ]
 *   [ Kontak · Alamat · Layanan (rounded collapsibles) ]
 *   ───────── fixed footer ─────────
 *   [ Laporan · Telepon · Share · Simpan ]
 */
import { Icon } from "@iconify/vue";
import { appToast } from "~/utils/appToast";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";
import { displayEtaMinutes } from "~/utils/rankUnits";
import { formatDistance } from "~/utils/geo";
import { unitUsesWaDispatch } from "~/utils/waContact";

type TabKey = "detail" | "reviews" | "about";

const detailSheet = useDetailSheetStore();
const exploreSheet = useExploreSheetStore();
const orderSheet = useOrderSheetStore();
const reviewSheet = useReviewSheetStore();
const mapUrl = useMapUrl();
const leaflet = useLeafletStore();
const { saved, toggleFromEmergency } = useSavedUnits();
const { rememberFromEmergency } = useRecentUnits();
const toast = appToast();

const data = computed(() => detailSheet.detailSheetData);
const emergency = computed(() => data.value?.emergency);
const emergencyData = computed(() => emergency.value?.emergencyData);
const emergencyType = computed(() => data.value?.emergencyType);
const tripData = computed(() => emergency.value?.trip);
const waDispatch = computed(() => unitUsesWaDispatch(emergency.value));
const isHospital = computed(() => emergencyData.value?.organization_type === "rumah_sakit");

const activeTab = ref<TabKey>("detail");
const tabs: { key: TabKey; label: string }[] = [
  { key: "detail", label: "Detail" },
  { key: "reviews", label: "Reviews" },
  { key: "about", label: "About" },
];

// Sheet ref for programmatic snap; scroll ref for auto-expand-on-scroll.
// Flow: pills + tabs live in the sticky header, always visible. When the user
// scrolls the body more than 20 px we bump the sheet from `half` (0.55) to
// `full` (0.75 — capped so the map/route stays visible above the sheet).
//
// On expand, the Leaflet map is re-framed so the route bounds (user location +
// unit) fit into the visible strip ABOVE the sheet — otherwise a naive
// setZoom would leave the interesting content underneath the panel. On
// collapse, the previous view (center + zoom) is restored so the user gets
// back exactly what they were looking at.

const sheetRef = ref<{ snapTo(idx: number): void; visibleHeight(): number } | null>(null);
const scrollBodyRef = ref<HTMLElement | null>(null);
let expandedByScroll = false;
let savedZoom: number | null = null;
let savedCenter: { lat: number; lng: number } | null = null;

function currentSheetHeightPx(): number {
  return sheetRef.value?.visibleHeight() ?? 0;
}

function routePoints(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const s = leaflet.routeStartPoint;
  if (s?.lat && s?.lng) out.push([s.lat, s.lng]);
  const e = leaflet.routeEndPoint;
  if (e?.lat && e?.lng) out.push([e.lat, e.lng]);
  if (out.length < 2) {
    // Fall back to the emergency's own coords for the second anchor.
    const c = emergencyData.value?.coordinates;
    if (Array.isArray(c) && c.length >= 2) {
      const lat = Number(c[1]);
      const lng = Number(c[0]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
    }
  }
  return out;
}

function applyMapViewForExpanded() {
  const map = leaflet.mapInstance;
  if (!map) return;

  // Snapshot current view so restore is exact.
  const c = map.getCenter();
  savedZoom = map.getZoom();
  savedCenter = { lat: c.lat, lng: c.lng };

  const pts = routePoints();
  if (pts.length === 0) return;

  const sheetH = currentSheetHeightPx() || Math.round(window.innerHeight * 0.75);
  const opts = {
    paddingTopLeft: [24, 60] as [number, number],
    paddingBottomRight: [24, sheetH + 20] as [number, number],
    maxZoom: 16,
    animate: true,
    duration: 0.4,
  };

  if (pts.length === 1) {
    // Single anchor — offset by half the sheet so the pin sits in the
    // visible strip above.
    const [lat, lng] = pts[0]!;
    const zTarget = Math.max(map.getMinZoom?.() ?? 5, savedZoom! - 1);
    map.setView([lat, lng], zTarget, { animate: true });
    map.panBy([0, -sheetH / 3], { animate: true });
    return;
  }

  map.fitBounds(pts, opts);
}

function restoreMapView() {
  const map = leaflet.mapInstance;
  if (!map) return;
  if (savedCenter && savedZoom != null) {
    map.setView([savedCenter.lat, savedCenter.lng], savedZoom, { animate: true });
  } else if (savedZoom != null) {
    map.setZoom(savedZoom, { animate: true });
  }
  savedZoom = null;
  savedCenter = null;
}

function onBodyScroll(e: Event) {
  const y = (e.target as HTMLElement).scrollTop;
  if (y > 20 && !expandedByScroll) {
    expandedByScroll = true;
    sheetRef.value?.snapTo(2);
  } else if (y <= 4 && expandedByScroll) {
    expandedByScroll = false;
    sheetRef.value?.snapTo(1);
  }
}

// Map view follows sheet size regardless of trigger (auto-snap or manual swipe).
// CoreSheet reports its target height as soon as it snaps, so the map can
// re-frame in parallel with the (compositor-only) sheet animation.

function toggleMapSheetMax(on: boolean) {
  const el = leaflet.mapInstance?.getContainer?.();
  el?.classList.toggle("bb-map--sheet-max", on);
}

function onSnapChange(idx: number) {
  if (idx >= 2 && savedZoom == null) {
    toggleMapSheetMax(true);
    applyMapViewForExpanded();
  } else if (idx < 2 && savedZoom != null) {
    toggleMapSheetMax(false);
    restoreMapView();
  }
}

// ── Meta chips ───────────────────────────────────────────────────────────────

const etaMinutes = computed(() => {
  const sec = leaflet.routeTravel?.durationSec;
  if (sec != null && Number.isFinite(sec)) return Math.max(1, Math.round(sec / 60));
  return displayEtaMinutes(tripData.value?.duration);
});

const distanceLabel = computed(() => {
  const m = leaflet.routeTravel?.distanceM ?? tripData.value?.distance;
  return typeof m === "number" && Number.isFinite(m) ? formatDistance(m) : "";
});

const roleLabel = computed(() => {
  if (emergencyData.value?.is_province_dispatcher) return "Dispatcher Provinsi";
  if (emergencyData.value?.is_dispatcher) return "Dispatcher Kab/Kota";
  return "Komunitas";
});

const headerTitle = computed(() => emergencyData.value?.name ?? "Bantuan darurat");
const headerSubtitle = computed(() => emergencyData.value?.organization_name ?? "");

const isUnitSaved = computed(() => saved(emergencyData.value?.id));

// ── Notice items (Perhatian penting) ─────────────────────────────────────────

const noticeItems = [
  "Isi form sesuai kondisi dan keadaan sebenarnya.",
  "Jangan buat laporan palsu — ada konsekuensi hukum.",
  "Sertakan lokasi dan kondisi korban sedetail mungkin.",
  "Foto opsional membantu unit mempersiapkan penanganan.",
  "Pastikan nomor HP aktif — unit akan menghubungi untuk konfirmasi.",
];

// ── Tab data ─────────────────────────────────────────────────────────────────

const contact = computed(() => emergencyData.value?.contact ?? {});
const address = computed(() => emergencyData.value?.address ?? {});
const tipeEmergency = computed<string[]>(() => emergencyData.value?.tipe_emergency ?? []);
const typeOfService = computed<string>(() => String(emergencyData.value?.type_of_service ?? "").trim());
const description = computed<string>(() => String(emergencyData.value?.description ?? "").trim());

// ── Actions ──────────────────────────────────────────────────────────────────

function toggleSaveUnit() {
  if (!emergencyData.value?.id) return;
  const next = toggleFromEmergency(emergency.value);
  toast.success(
    next ? `${emergencyData.value.name} tersimpan` : "Dihapus dari unit tersimpan",
  );
}

function onLaporan() {
  if (isHospital.value) return onTelepon();
  rememberFromEmergency(emergency.value, "whatsapp");
  const wa =
    emergencyData.value?.contact?.whatsapp ||
    emergencyData.value?.contact?.phone ||
    "";
  orderSheet.open(
    String(emergencyData.value?.id ?? ""),
    emergencyData.value?.name ?? "",
    "whatsapp",
    wa,
    { waDispatch: waDispatch.value },
  );
}

function onTelepon() {
  rememberFromEmergency(emergency.value, "phone");
  const phone = emergencyData.value?.contact?.phone;
  if (!phone) {
    toast.error("Nomor telepon tidak tersedia");
    return;
  }
  window.location.href = `tel:+${convertPhoneNumber(phone)}`;
}

function onWhatsAppChat() {
  const wa =
    emergencyData.value?.contact?.whatsapp ||
    emergencyData.value?.contact?.phone;
  if (!wa) {
    toast.error("WhatsApp tidak tersedia");
    return;
  }
  rememberFromEmergency(emergency.value, "whatsapp");
  window.location.href = `https://wa.me/${convertPhoneNumber(wa)}`;
}

async function onShare() {
  const name = emergencyData.value?.name ?? "Bantuan darurat";
  const shareData = {
    title: name,
    text: `${name} — ${emergencyData.value?.address?.full_address ?? ""}`,
    url: typeof window !== "undefined" ? window.location.href : "",
  };
  try {
    const nav = navigator as unknown as {
      share?: (d: object) => Promise<void>;
      clipboard?: { writeText(v: string): Promise<void> };
    };
    if (nav.share) return void (await nav.share(shareData));
    if (nav.clipboard) {
      await nav.clipboard.writeText(shareData.url);
      toast.success("Link disalin");
      return;
    }
    toast.error("Perangkat tidak mendukung berbagi");
  } catch { /* user cancelled */ }
}

function openReviewSheet() {
  const d = emergencyData.value;
  if (!d?.id) return;
  reviewSheet.open(String(d.id), d.name ?? "", "whatsapp");
}

// ── Reviews — fetched lazily from public unit stats endpoint ─────────────────
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;

type ReviewsPayload = {
  total: number;
  helpful_rate: number;
  show_rate: boolean;
  recent_quotes: string[];
};

const reviewsLoading = ref(false);
const reviewsData = ref<ReviewsPayload | null>(null);
const reviewsError = ref<string | null>(null);
let reviewsFetchedForId: string | null = null;

async function loadReviews() {
  const id = emergencyData.value?.id;
  if (!id) return;
  if (reviewsFetchedForId === String(id)) return;
  reviewsFetchedForId = String(id);
  reviewsLoading.value = true;
  reviewsError.value = null;
  reviewsData.value = null;
  try {
    type Envelope = { data?: { feedback?: ReviewsPayload } };
    const res = await $fetch<Envelope>(
      `${apiBase}/api/v1/public/units/${encodeURIComponent(String(id))}/stats`,
      { query: { period: 90 } },
    );
    reviewsData.value = res?.data?.feedback ?? null;
  } catch (err) {
    reviewsError.value = err instanceof Error ? err.message : "Gagal memuat review";
  } finally {
    reviewsLoading.value = false;
  }
}

watch(activeTab, (tab) => {
  if (tab === "reviews") void loadReviews();
});
watch(
  () => emergencyData.value?.id,
  () => {
    reviewsFetchedForId = null;
    reviewsData.value = null;
  },
);

// ── Sheet lifecycle ──────────────────────────────────────────────────────────

function handleClose() {
  mapUrl.clearUnit();
  detailSheet.onClose();
}

watch(
  () => detailSheet.isOpen,
  (open) => {
    if (open) {
      activeTab.value = "detail";
      expandedByScroll = false;
      nextTick(() => {
        if (scrollBodyRef.value) scrollBodyRef.value.scrollTop = 0;
      });
    } else {
      // Sheet closed — put the map back to whatever view the user had.
      restoreMapView();
      toggleMapSheetMax(false);
      if (detailSheet.fromExploreList) {
        detailSheet.clearExploreReturn();
        // Wait for the sheet close animation (~360 ms) to finish before
        // reopening the explore list. Reopening synchronously briefly stacks
        // both sheets over the map — the overlap the user reported.
        window.setTimeout(() => exploreSheet.onOpen(), 380);
      }
    }
  },
);

// Tab switch → reset scroll (do NOT collapse the sheet — user swipe controls).
watch(activeTab, () => {
  nextTick(() => {
    if (scrollBodyRef.value) scrollBodyRef.value.scrollTop = 0;
    expandedByScroll = false;
  });
});
</script>

<template>
  <CoreSheet
    ref="sheetRef"
    :is-open="detailSheet.isOpen"
    :snap-points="[280, 0.55, 0.75]"
    :initial-snap="1"
    draggable
    @close="handleClose"
    @snap-change="onSnapChange"
  >
    <template #header>
      <div v-if="emergencyData" style="background: #ffffff">
        <!-- Identity + close -->
        <div class="flex items-start gap-2.5 px-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center ui-icon-well--danger"
            style="border-radius: 0.75rem"
          >
            <Icon
              :icon="emergencyType?.icon || emergencyData?.emergency_type?.icon || 'mynaui:ambulance-solid'"
              class="text-[20px]"
            />
          </div>
          <div class="min-w-0 flex-1">
            <h1
              class="m-0 truncate text-[17px] font-semibold leading-tight"
              style="color: #202124; letter-spacing: -0.01em"
            >
              {{ headerTitle }}
            </h1>
            <p
              v-if="headerSubtitle"
              class="mt-0.5 truncate text-[12.5px] leading-tight"
              style="color: #5f6368"
            >
              {{ headerSubtitle }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span class="text-[12px] font-medium" style="color: #1a73e8">{{ roleLabel }}</span>
              <span v-if="etaMinutes != null" style="color: #dadce0">·</span>
              <span
                v-if="etaMinutes != null"
                class="text-[12px] font-medium"
                :style="{ color: etaMinutes <= 5 ? '#137333' : '#5f6368' }"
              >
                {{ etaMinutes }} min
              </span>
              <span v-if="distanceLabel" style="color: #dadce0">·</span>
              <span v-if="distanceLabel" class="text-[12px] font-medium" style="color: #5f6368">
                {{ distanceLabel }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style="background: #f1f3f4"
            aria-label="Tutup"
            @click="handleClose"
          >
            <Icon icon="ion:close" class="text-[16px]" style="color: #5f6368" />
          </button>
        </div>

        <!-- Action pills — always visible, above tabs -->
        <div class="mt-2.5 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          <button type="button" class="bb-action-pill bb-action-pill--primary shrink-0" @click="onLaporan">
            <Icon :icon="isHospital ? 'lucide:phone' : 'lucide:siren'" class="text-[15px]" />
            {{ isHospital ? "Hubungi IGD" : "Buat laporan" }}
          </button>
          <button
            v-if="!isHospital"
            type="button"
            class="bb-action-pill shrink-0"
            @click="onWhatsAppChat"
          >
            <Icon icon="ic:baseline-whatsapp" class="text-[14px]" />
            WhatsApp
          </button>
          <button type="button" class="bb-action-pill shrink-0" @click="onTelepon">
            <Icon icon="lucide:phone" class="text-[14px]" />
            Telepon
          </button>
          <button type="button" class="bb-action-pill shrink-0" @click="onShare">
            <Icon icon="lucide:share-2" class="text-[14px]" />
            Share
          </button>
          <button
            type="button"
            class="bb-action-pill shrink-0"
            :class="isUnitSaved && 'bb-action-pill--saved'"
            :aria-pressed="isUnitSaved"
            @click="toggleSaveUnit"
          >
            <Icon :icon="isUnitSaved ? 'lucide:bookmark-check' : 'lucide:bookmark'" class="text-[14px]" />
            {{ isUnitSaved ? "Tersimpan" : "Simpan" }}
          </button>
        </div>

        <!-- Tabs -->
        <div class="mt-1.5 flex gap-6 overflow-x-auto px-4 scrollbar-none" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === t.key"
            class="bb-tab shrink-0"
            :class="activeTab === t.key && 'bb-tab--active'"
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="h-px w-full" style="background: #e8eaed" />
      </div>
    </template>

    <!-- Body: scrollable content only (pills are in the header now) -->
    <div class="flex flex-col h-full" style="background: #ffffff">
      <div
        ref="scrollBodyRef"
        class="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 space-y-3"
        @scroll.passive="onBodyScroll"
      >
        <!-- Detail tab -->
        <template v-if="activeTab === 'detail'">
          <DetailNoticeCard :items="noticeItems" />

          <DetailCard
            v-if="address.full_address"
            icon="lucide:map-pin"
            :summary="address.full_address"
            :hint="[address.regency, address.province].filter(Boolean).join(' · ')"
          >
            <div class="pt-1 text-[13px]" style="color: #5f6368">
              Wilayah: {{ [address.regency, address.province].filter(Boolean).join(", ") || "-" }}
            </div>
          </DetailCard>

          <DetailCard
            icon="lucide:phone"
            :summary="contact.phone || contact.whatsapp || 'Tidak ada kontak'"
            hint="Kontak unit"
          >
            <ul class="m-0 list-none p-0 space-y-1.5 pt-1 text-[13.5px]" style="color: #202124">
              <li v-if="contact.phone" class="flex items-center gap-2">
                <Icon icon="lucide:phone" class="text-[15px]" style="color: #5f6368" />
                <span>{{ contact.phone }}</span>
              </li>
              <li v-if="contact.whatsapp" class="flex items-center gap-2">
                <Icon icon="ic:baseline-whatsapp" class="text-[15px]" style="color: #5f6368" />
                <span>{{ contact.whatsapp }}</span>
              </li>
              <li v-if="contact.email" class="flex items-center gap-2">
                <Icon icon="lucide:mail" class="text-[15px]" style="color: #5f6368" />
                <span>{{ contact.email }}</span>
              </li>
              <li v-if="!contact.phone && !contact.whatsapp && !contact.email" style="color: #5f6368">
                Kontak tidak tersedia.
              </li>
            </ul>
          </DetailCard>

          <DetailCard icon="lucide:clock" summary="24 jam · setiap hari" hint="Jam operasional">
            <div class="pt-1 text-[13px]" style="color: #5f6368">
              Unit siaga selama 24 jam. Waktu respon dapat bervariasi tergantung antrian.
            </div>
          </DetailCard>

          <DetailCard
            icon="lucide:shield"
            :summary="typeOfService || 'Layanan darurat'"
            :hint="`Peran: ${roleLabel}`"
          >
            <div class="pt-1">
              <p class="m-0 text-[12px]" style="color: #5f6368">Tipe layanan</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <span
                  v-for="t in tipeEmergency"
                  :key="t"
                  class="rounded-full px-2.5 py-1 text-[12px] font-medium capitalize"
                  style="background: #ffffff; color: #202124; border: 1px solid #dadce0"
                >
                  {{ t }}
                </span>
                <span v-if="!tipeEmergency.length" class="text-[12.5px]" style="color: #5f6368">
                  Tidak ada tag layanan.
                </span>
              </div>
            </div>
          </DetailCard>
        </template>

        <!-- Reviews tab — live from public unit stats -->
        <section v-else-if="activeTab === 'reviews'" role="tabpanel">
          <!-- Loading -->
          <div v-if="reviewsLoading" class="space-y-2 py-3">
            <div class="soft-skel h-12 w-full rounded-xl" />
            <div class="soft-skel h-16 w-full rounded-xl" />
            <div class="soft-skel h-16 w-full rounded-xl" />
          </div>

          <!-- Loaded with data -->
          <div
            v-else-if="reviewsData && reviewsData.total > 0"
            class="space-y-3"
          >
            <!-- Summary card -->
            <div
              class="rounded-2xl px-4 py-3 flex items-center gap-4"
              style="background: #f1f3f4"
            >
              <div class="flex flex-col items-start">
                <div class="flex items-baseline gap-1">
                  <span
                    class="text-[26px] font-semibold leading-none"
                    style="color: #202124"
                  >
                    {{ reviewsData.show_rate ? reviewsData.helpful_rate.toFixed(0) : "—" }}
                  </span>
                  <span
                    v-if="reviewsData.show_rate"
                    class="text-[13px]"
                    style="color: #5f6368"
                  >% dinilai membantu</span>
                </div>
                <p class="mt-1 text-[12px]" style="color: #5f6368">
                  {{ reviewsData.total }} feedback dari warga
                </p>
              </div>
              <div
                v-if="reviewsData.show_rate"
                class="ml-auto flex h-10 w-10 items-center justify-center rounded-full"
                :style="{
                  background: reviewsData.helpful_rate >= 70 ? '#e6f4ea' : reviewsData.helpful_rate >= 40 ? '#fef7e0' : '#fce8e6',
                  color: reviewsData.helpful_rate >= 70 ? '#137333' : reviewsData.helpful_rate >= 40 ? '#b06000' : '#c5221f',
                }"
              >
                <Icon
                  :icon="reviewsData.helpful_rate >= 70 ? 'lucide:thumbs-up' : reviewsData.helpful_rate >= 40 ? 'lucide:meh' : 'lucide:thumbs-down'"
                  class="text-[20px]"
                />
              </div>
            </div>

            <!-- Recent quotes -->
            <div
              v-if="reviewsData.recent_quotes && reviewsData.recent_quotes.length"
              class="space-y-2"
            >
              <p class="px-1 text-[12px] font-medium" style="color: #5f6368">
                Kutipan terbaru
              </p>
              <blockquote
                v-for="(quote, idx) in reviewsData.recent_quotes"
                :key="idx"
                class="rounded-xl px-3.5 py-3 text-[13.5px] leading-relaxed"
                style="background: #f8f9fa; border-left: 3px solid #dadce0; color: #202124"
              >
                “{{ quote }}”
              </blockquote>
            </div>

            <button
              type="button"
              class="mt-1 w-full rounded-full px-4 py-2.5 text-[13px] font-semibold text-white transition-transform active:scale-[0.98]"
              style="background: var(--bb-accent, #d93025)"
              @click="openReviewSheet"
            >
              Beri review kamu
            </button>
          </div>

          <!-- Error -->
          <div
            v-else-if="reviewsError"
            class="flex flex-col items-center gap-2 py-8 text-center"
          >
            <Icon icon="lucide:cloud-off" class="text-[28px]" style="color: #5f6368" />
            <p class="text-[13px]" style="color: #5f6368">{{ reviewsError }}</p>
            <button
              type="button"
              class="text-[13px] font-medium underline underline-offset-2"
              style="color: #1a73e8"
              @click="reviewsFetchedForId = null; loadReviews()"
            >
              Coba lagi
            </button>
          </div>

          <!-- Empty -->
          <div v-else class="flex flex-col items-center gap-3 py-10 text-center">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-full"
              style="background: #f1f3f4; color: #5f6368"
            >
              <Icon icon="lucide:message-square" class="text-2xl" />
            </div>
            <div class="max-w-xs">
              <p class="text-[14px] font-medium" style="color: #202124">Belum ada review</p>
              <p class="mt-1 text-[12.5px] leading-snug" style="color: #5f6368">
                Bagikan pengalamanmu setelah menerima bantuan agar warga lain terbantu.
              </p>
            </div>
            <button
              type="button"
              class="mt-1 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[0.98]"
              style="background: var(--bb-accent, #d93025)"
              @click="openReviewSheet"
            >
              Beri review pertama
            </button>
          </div>
        </section>

        <!-- About tab -->
        <template v-else-if="activeTab === 'about'">
          <DetailCard
            icon="lucide:info"
            :summary="description || 'Tidak ada deskripsi.'"
            :hint="description ? 'Deskripsi unit' : undefined"
          >
            <p v-if="description" class="m-0 pt-1 text-[13.5px] leading-relaxed" style="color: #202124">
              {{ description }}
            </p>
          </DetailCard>

          <DetailCard
            v-if="emergencyData?.organization_name"
            icon="lucide:landmark"
            :summary="emergencyData.organization_name"
            hint="Organisasi"
          >
            <div class="pt-1 text-[13.5px]" style="color: #202124">
              {{ emergencyData.organization_name }}
              <span v-if="emergencyData?.organization_type" style="color: #5f6368">
                · {{ emergencyData.organization_type }}
              </span>
            </div>
          </DetailCard>
        </template>
      </div>

    </div>
  </CoreSheet>
</template>

<style scoped>
/* Action pill — Google-Maps-inspired */
.bb-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 9999px;
  background: #ffffff;
  color: #202124;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #dadce0;
  white-space: nowrap;
  transition: transform 0.12s ease, background 0.12s ease;
  letter-spacing: -0.005em;
}
.bb-action-pill:active {
  transform: scale(0.97);
  background: #f8f9fa;
}
.bb-action-pill--primary {
  background: var(--bb-accent, #d93025);
  color: #ffffff;
  border-color: transparent;
  font-weight: 600;
  padding: 0.55rem 1.05rem;
}
.bb-action-pill--primary:active {
  background: #a52a1e;
}
.bb-action-pill--saved {
  color: var(--bb-accent, #d93025);
  border-color: var(--bb-accent, #d93025);
  background: #ffffff;
}

/* Tab strip — GMaps: medium weight, 3px underline */
.bb-tab {
  position: relative;
  padding: 0.75rem 0.15rem;
  font-size: 14px;
  font-weight: 500;
  color: #5f6368;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
  letter-spacing: 0;
}
.bb-tab::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: transparent;
  transition: background 0.15s ease;
}
.bb-tab--active {
  color: var(--bb-accent, #d93025);
  font-weight: 600;
}
.bb-tab--active::after {
  background: var(--bb-accent, #d93025);
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { scrollbar-width: none; }
</style>
