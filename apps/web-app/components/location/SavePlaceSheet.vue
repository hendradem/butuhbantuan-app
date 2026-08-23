<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  PLACE_SLOTS,
  clearPlace,
  getSavedPlace,
  savePlace,
  savedPlacesTick,
} from "~/utils/savedPlaces";
import { appToast } from "~/utils/appToast";

const sheet = useSavePlaceSheetStore();
const userLocation = useUserLocationStore();
const toast = appToast();

const meta = computed(
  () => PLACE_SLOTS.find((s) => s.slot === sheet.slot) || PLACE_SLOTS[0],
);

const existing = computed(() => {
  void savedPlacesTick.value;
  return getSavedPlace(sheet.slot);
});

const pinReady = computed(
  () =>
    Number.isFinite(userLocation.lat) &&
    Number.isFinite(userLocation.long) &&
    Math.abs(userLocation.lat) > 0.01,
);

const addressPreview = computed(() => {
  const a = String(userLocation.fullAddress || "").trim();
  return a || "Pin di peta (alamat belum terbaca)";
});

function confirmSave() {
  if (!pinReady.value) {
    toast.error("Geser pin biru di peta dulu, lalu simpan lagi");
    return;
  }
  const replacing = !!getSavedPlace(sheet.slot);
  const place = savePlace(sheet.slot, {
    lat: userLocation.lat,
    lng: userLocation.long,
    address: userLocation.fullAddress,
  });
  sheet.onClose();
  if (place) {
    toast.success(replacing ? `${place.label} diperbarui` : `${place.label} tersimpan`);
  }
}

function confirmRemove() {
  const label = meta.value.label;
  clearPlace(sheet.slot);
  sheet.onClose();
  toast.success(`${label} dihapus`);
}
</script>

<template>
  <CoreSheet
    :is-open="sheet.isOpen"
    :snap-points="[340, 0]"
    is-overlay
    @close="sheet.onClose()"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <h1 class="ui-sheet-title">
          {{ sheet.mode === "remove" ? `Hapus ${meta.label}?` : `Simpan ${meta.label}` }}
        </h1>
        <button type="button" class="ui-close-btn" @click="sheet.onClose()">
          <Icon icon="lucide:x" class="text-base" />
        </button>
      </div>
    </template>

    <div class="px-4 pb-5 space-y-3">
      <template v-if="sheet.mode !== 'remove'">
        <div
          class="px-3.5 py-3"
          style="
            background: var(--bb-bg-muted);
            border-radius: var(--bb-radius-card);
            border: 1px solid var(--bb-border);
          "
        >
          <p class="m-0 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
            Pin saat ini
          </p>
          <p class="m-0 mt-1 text-[13px] font-semibold ui-text-primary leading-snug">
            {{ addressPreview }}
          </p>
        </div>

        <p class="m-0 text-[12px] ui-text-secondary leading-relaxed">
          <template v-if="existing">
            {{ meta.label }} sudah ada — menyimpan akan mengganti lokasi lama.
          </template>
          <template v-else>
            Setelah disimpan, buka chip {{ meta.label }} di atas menu untuk loncat ke sini.
          </template>
        </p>

        <p
          v-if="!pinReady"
          class="m-0 text-[12px] font-medium"
          style="color: var(--bb-danger)"
        >
          Belum ada pin. Geser pin biru di peta dulu.
        </p>

        <button
          type="button"
          class="ui-btn-primary"
          :disabled="!pinReady"
          @click="confirmSave"
        >
          <Icon :icon="meta.icon" class="text-base" />
          {{ existing ? `Ganti ${meta.label}` : `Simpan sebagai ${meta.label}` }}
        </button>

        <button
          v-if="existing"
          type="button"
          class="w-full text-sm font-semibold py-2"
          style="color: var(--bb-danger)"
          @click="sheet.openRemove(sheet.slot)"
        >
          Hapus {{ meta.label }}
        </button>
      </template>

      <template v-else>
        <p class="m-0 text-[13px] ui-text-secondary leading-relaxed">
          {{ meta.label }} akan dihapus dari favorit.
        </p>
        <button
          type="button"
          class="w-full py-3 text-sm font-semibold text-white"
          style="background: var(--bb-danger); border-radius: var(--bb-radius-control)"
          @click="confirmRemove"
        >
          Hapus {{ meta.label }}
        </button>
        <button
          type="button"
          class="w-full text-sm font-semibold py-2.5 ui-text-secondary"
          @click="sheet.onClose()"
        >
          Batal
        </button>
      </template>
    </div>
  </CoreSheet>
</template>
