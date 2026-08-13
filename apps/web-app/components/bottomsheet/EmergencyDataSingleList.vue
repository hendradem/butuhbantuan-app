<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { convertPhoneNumber } from "~/utils/convertPhoneNumber";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import { formatDistance } from "~/utils/geo";
import { partnerTierBadgeClass, partnerTierLabel, partnerTierOf } from "~/utils/partnerTier";

function isOpenNow(op: any): boolean {
  if (!op) return true;
  if (!op.is_active) return false;
  if (op.is_24_hours) return true;
  const now = new Date();
  const [oh, om] = (op.open_time || "00:00").split(":").map(Number);
  const [ch, cm] = (op.close_time || "23:59").split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

const props = defineProps<{ data: any }>();

const orderSheet = useOrderSheetStore();

const emergencyData = computed(() => props.data?.emergencyData);
const tripData = computed(() => props.data?.trip);
const tier = computed(() => partnerTierOf(emergencyData.value));

const etaMinutes = computed(() => {
  const d = tripData.value?.duration;
  if (d == null || Number.isNaN(d)) return null;
  return Math.min(Math.floor(d) * 2, 20);
});

const openLabel = computed(() => {
  const op = emergencyData.value?.operational;
  if (!op) return "";
  if (!isOpenNow(op)) return "Tutup";
  if (op.is_24_hours) return "Buka · 24 jam";
  if (op.open_time && op.close_time) return `Buka · ${op.open_time}–${op.close_time}`;
  return "Buka";
});

const locationLabel = computed(() =>
  cityNameFormat(emergencyData.value?.address?.regency ?? "")
);

function etaBadgeClass(mins: number | null) {
  if (mins == null) return "bg-neutral-50 text-neutral-700 border-neutral-200";
  if (mins <= 15) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (mins <= 18) return "bg-amber-50 text-amber-800 border-amber-200";
  if (mins <= 20) return "bg-red-50 text-red-800 border-red-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function distanceBadgeClass(meters?: number) {
  const m = meters ?? 0;
  if (m <= 2000) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (m <= 5000) return "bg-amber-50 text-amber-800 border-amber-200";
  if (m <= 10000) return "bg-red-50 text-red-800 border-red-200";
  return "bg-neutral-50 text-neutral-700 border-neutral-200";
}

function onHubungiClick(e: Event) {
  e.stopPropagation();
  // Form laporan selalu bisa dibuka; nomor WA opsional (dipakai setelah tiket dibuat).
  const wa = emergencyData.value?.contact?.whatsapp
    || emergencyData.value?.contact?.phone
    || "";
  orderSheet.open(
    String(emergencyData.value?.id ?? ""),
    emergencyData.value?.name ?? "",
    "whatsapp",
    wa
  );
}

function onTeleponClick(e: Event) {
  e.stopPropagation();
  const phone = emergencyData.value?.contact?.phone;
  if (!phone) return;
  const digits = convertPhoneNumber(phone);
  window.location.href = `tel:+${digits}`;
}
</script>

<template>
  <div class="mx-3 mb-2.5">
    <div class="p-4 rounded-xl bg-white border border-neutral-200">
      <div class="flex gap-3.5 items-start">
        <div class="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-200 p-1.5 flex items-center justify-center shrink-0">
          <img
            v-if="emergencyData"
            :src="emergencyLogoSrc(emergencyData)"
            alt="logo"
            class="w-full h-full object-contain"
            @error="onEmergencyLogoError($event, emergencyData)"
          >
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-semibold text-base leading-snug text-neutral-900 min-w-0 truncate">
              {{ emergencyData?.name }}
            </h3>
            <span
              v-if="locationLabel"
              class="shrink-0 inline-flex items-center gap-1 text-xs text-neutral-500 leading-snug pt-0.5"
            >
              <Icon icon="mingcute:location-fill" class="text-xs" />
              {{ locationLabel }}
            </span>
          </div>

          <p class="mt-0.5 text-sm text-neutral-500 truncate">
            {{ emergencyData?.organization_name }}
          </p>

          <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              :class="[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                partnerTierBadgeClass(tier),
              ]"
            >
              {{ partnerTierLabel(tier) }}
            </span>
            <span
              v-if="etaMinutes != null"
              :class="[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                etaBadgeClass(etaMinutes),
              ]"
            >
              <Icon icon="heroicons:clock" class="text-sm" />
              {{ etaMinutes }} min
            </span>
            <span
              v-if="tripData"
              :class="[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                distanceBadgeClass(tripData.distance),
              ]"
            >
              <Icon icon="mingcute:route-fill" class="text-sm" />
              {{ formatDistance(tripData.distance ?? 0) }}
            </span>
          </div>

          <p v-if="openLabel" class="mt-2 text-xs text-neutral-500">
            {{ openLabel }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="btn-whatsapp text-sm !rounded-lg !mb-0"
          @click="onHubungiClick"
        >
          <Icon icon="mingcute:chat-1-fill" class="w-5 h-5 mr-2" />
          Hubungi
        </button>
        <button
          type="button"
          :disabled="!emergencyData?.contact?.phone"
          :class="['btn-call text-sm !rounded-lg !mb-0', !emergencyData?.contact?.phone ? 'opacity-80 cursor-not-allowed' : '']"
          @click="onTeleponClick"
        >
          <Icon icon="mdi:phone" class="w-5 h-5 mr-2" />
          Telepon
        </button>
      </div>
    </div>
  </div>
</template>
