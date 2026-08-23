<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { cityNameFormat } from "~/utils/cityNameFormat";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import { formatDistance } from "~/utils/geo";
import {
  partnerTierBadgeClass,
  partnerTierLabel,
  partnerTierOf,
} from "~/utils/partnerTier";
import type { RankHint } from "~/utils/rankUnits";
import { displayEtaMinutes, isUnitOpenNow } from "~/utils/rankUnits";
import { SOFT_LABEL, softLabelTone } from "~/utils/softLabel";

const props = defineProps<{
  emergency: any;
  /** Show Hubungi / Telepon actions (detail sheet). */
  actions?: boolean;
  /** Smart-rank visual hint (list only). */
  rankHint?: RankHint | null;
}>();

const emit = defineEmits<{
  hubungi: [];
  telepon: [];
}>();

const leaflet = useLeafletStore();

const data = computed(() => props.emergency?.emergencyData ?? props.emergency);
const trip = computed(() => props.emergency?.trip);

const tier = computed(() => partnerTierOf(data.value));

/** In detail view, prefer OSRM route stats so card matches the map bubble. */
const etaMinutes = computed(() => {
  if (props.actions) {
    const sec = leaflet.routeTravel?.durationSec;
    if (sec != null && Number.isFinite(sec)) {
      return Math.max(1, Math.round(sec / 60));
    }
  }
  return displayEtaMinutes(trip.value?.duration);
});

const distanceMeters = computed(() => {
  if (props.actions) {
    const m = leaflet.routeTravel?.distanceM;
    if (m != null && Number.isFinite(m)) return m;
  }
  if (!trip.value) return null;
  const m = trip.value.distance;
  return m != null && Number.isFinite(m) ? m : null;
});

const distanceLabel = computed(() => {
  if (distanceMeters.value == null) return "";
  return formatDistance(distanceMeters.value);
});

const locationLabel = computed(() =>
  cityNameFormat(data.value?.address?.regency ?? ""),
);

const orgLabel = computed(() =>
  String(data.value?.organization_name || "").trim(),
);

const openLabel = computed(() => {
  const op = data.value?.operational;
  if (!op) return "";
  if (!isUnitOpenNow(op)) return "Tutup";
  if (op.is_24_hours) return "Buka · 24 jam";
  if (op.open_time && op.close_time) return `Buka · ${op.open_time}–${op.close_time}`;
  return "Buka";
});

const contactLabel = computed(() => {
  const c = data.value?.contact;
  if (!c) return "";
  return c.phone || c.whatsapp || c.email || "";
});

const serviceLabel = computed(() => {
  const raw = data.value?.type_of_service;
  if (typeof raw === "string" && raw.trim()) return raw.replace(/,/g, " · ");
  const tipe = data.value?.tipe_emergency;
  if (Array.isArray(tipe) && tipe.length) {
    return tipe.map((t: string) => String(t)).join(" · ");
  }
  return data.value?.emergency_type?.name || "";
});

const description = computed(() => {
  const d = String(data.value?.description || "").trim();
  return d;
});

/** Secondary line under title — org, else service/type. */
const subtitle = computed(() => {
  return orgLabel.value || serviceLabel.value || "Unit layanan darurat";
});

const FACTS_PREVIEW = 2;
const factsExpanded = ref(false);

const detailFacts = computed(() => {
  if (!props.actions) return [];
  const rows: { icon: string; label: string; value: string }[] = [];
  if (contactLabel.value) {
    rows.push({ icon: "lucide:phone", label: "Kontak", value: contactLabel.value });
  }
  if (serviceLabel.value) {
    rows.push({ icon: "lucide:shield", label: "Layanan", value: serviceLabel.value });
  }
  if (openLabel.value) {
    rows.push({ icon: "lucide:clock", label: "Operasional", value: openLabel.value });
  }
  if (description.value) {
    rows.push({ icon: "lucide:info", label: "Info", value: description.value });
  }
  return rows;
});

const emergencyId = computed(
  () => data.value?.id ?? props.emergency?.id ?? props.emergency?.emergencyData?.id,
);

watch(emergencyId, () => {
  factsExpanded.value = false;
});

const canToggleFacts = computed(() => detailFacts.value.length > FACTS_PREVIEW);

const previewFacts = computed(() => detailFacts.value.slice(0, FACTS_PREVIEW));

const extraFacts = computed(() => detailFacts.value.slice(FACTS_PREVIEW));

/** Travel-time badge: green → amber → red (previous thresholds). */
function etaBadgeClass(mins: number | null) {
  if (mins == null) return softLabelTone.neutral;
  if (mins <= 15) return softLabelTone.emerald;
  if (mins <= 18) return softLabelTone.amber;
  if (mins <= 20) return softLabelTone.red;
  return softLabelTone.neutral;
}

function distanceBadgeClass(meters: number | null) {
  const m = meters ?? 0;
  if (m <= 2000) return softLabelTone.emerald;
  if (m <= 5000) return softLabelTone.amber;
  if (m <= 10000) return softLabelTone.red;
  return softLabelTone.neutral;
}
</script>

<template>
  <article class="ui-list-card" :class="{ 'ui-list-card--detail': actions }">
    <div class="ui-list-card__row">
      <div class="ui-list-card__icon">
        <SkeletonImage
          v-if="data"
          :src="emergencyLogoSrc(data)"
          :alt="data?.name || 'unit'"
          wrapper-class="w-full h-full"
          img-class="w-full h-full object-contain"
          @error="onEmergencyLogoError($event, data)"
        />
        <Icon v-else icon="lucide:folder" class="text-sm ui-text-secondary" />
      </div>

      <div class="ui-list-card__content">
        <div class="ui-list-card__title-row">
          <h3 class="ui-list-card__title">{{ data?.name }}</h3>
          <span v-if="locationLabel" class="ui-list-card__location">
            <Icon icon="mingcute:location-fill" class="ui-list-card__meta-icon" />
            {{ locationLabel }}
          </span>
        </div>

        <p class="ui-list-card__desc">{{ subtitle }}</p>

        <div class="ui-list-card__badges" @click.stop @touchstart.stop>
          <span
            v-if="rankHint"
            :class="[SOFT_LABEL, softLabelTone.blue]"
          >
            #{{ rankHint.rank }} · {{ rankHint.label }}
          </span>
          <span :class="[SOFT_LABEL, partnerTierBadgeClass(tier)]">
            {{ partnerTierLabel(tier) }}
          </span>
          <span
            v-if="etaMinutes != null"
            :class="[SOFT_LABEL, etaBadgeClass(etaMinutes)]"
          >
            <Icon icon="heroicons:clock" />
            {{ etaMinutes }} min
          </span>
          <span
            v-if="distanceLabel"
            :class="[SOFT_LABEL, distanceBadgeClass(distanceMeters)]"
          >
            <Icon icon="mingcute:route-fill" />
            {{ distanceLabel }}
          </span>
        </div>

        <p
          v-if="actions && openLabel && !detailFacts.length"
          class="ui-list-card__open"
        >
          {{ openLabel }}
        </p>
      </div>
    </div>

    <div v-if="detailFacts.length" class="ui-list-card__facts-wrap">
      <ul class="ui-list-card__facts">
        <li
          v-for="row in previewFacts"
          :key="row.label"
          class="ui-list-card__fact"
          :class="{ 'ui-list-card__fact--wide': row.label === 'Info' }"
        >
          <Icon :icon="row.icon" class="ui-list-card__fact-icon" />
          <div class="ui-list-card__fact-body">
            <p class="ui-list-card__fact-label">{{ row.label }}</p>
            <p class="ui-list-card__fact-value">{{ row.value }}</p>
          </div>
        </li>
      </ul>

      <div v-if="canToggleFacts" class="ui-list-card__collapse">
        <button
          type="button"
          class="ui-list-card__collapse-trigger"
          :aria-expanded="factsExpanded"
          @click.stop="factsExpanded = !factsExpanded"
        >
          <span>{{ factsExpanded ? "Sembunyikan detail" : "Detail lainnya" }}</span>
          <Icon
            icon="lucide:chevron-down"
            class="ui-list-card__collapse-chevron"
            :class="{ 'ui-list-card__collapse-chevron--open': factsExpanded }"
          />
        </button>
        <ul
          v-show="factsExpanded"
          class="ui-list-card__facts ui-list-card__facts--extra"
        >
          <li
            v-for="row in extraFacts"
            :key="row.label"
            class="ui-list-card__fact"
            :class="{ 'ui-list-card__fact--wide': row.label === 'Info' }"
          >
            <Icon :icon="row.icon" class="ui-list-card__fact-icon" />
            <div class="ui-list-card__fact-body">
              <p class="ui-list-card__fact-label">{{ row.label }}</p>
              <p class="ui-list-card__fact-value">{{ row.value }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="actions" class="ui-list-card__actions" @click.stop>
      <button type="button" class="btn-whatsapp text-sm !mb-0 flex-1" @click="emit('hubungi')">
        <Icon icon="mingcute:chat-1-fill" class="w-4 h-4 mr-1.5" />
        Hubungi
      </button>
      <button
        type="button"
        class="btn-call text-sm !mb-0 flex-1"
        :disabled="!data?.contact?.phone"
        :class="!data?.contact?.phone ? 'opacity-80 cursor-not-allowed' : ''"
        @click="emit('telepon')"
      >
        <Icon icon="mdi:phone" class="w-4 h-4 mr-1.5" />
        Telepon
      </button>
    </div>
  </article>
</template>
