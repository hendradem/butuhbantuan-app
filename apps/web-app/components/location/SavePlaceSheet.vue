<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  PLACE_PRESETS,
  clearPlace,
  getSavedPlace,
  savePlace,
  savedPlacesTick,
} from "~/utils/savedPlaces";
import { appToast } from "~/utils/appToast";

const sheet = useSavePlaceSheetStore();
const userLocation = useUserLocationStore();
const toast = appToast();

const name = ref("");
const useMapPin = ref(false);

const existing = computed(() => {
  void savedPlacesTick.value;
  return sheet.editId ? getSavedPlace(sheet.editId) : null;
});

const pinReady = computed(() => {
  if (existing.value) return true;
  return (
    Number.isFinite(userLocation.lat) &&
    Number.isFinite(userLocation.long) &&
    Math.abs(userLocation.lat) > 0.01
  );
});

const addressPreview = computed(() => {
  if (existing.value && !useMapPin.value) return existing.value.address;
  const a = String(userLocation.fullAddress || "").trim();
  return a || "Pin di peta (alamat belum terbaca)";
});

const canSave = computed(() => pinReady.value && !!name.value.trim());

watch(
  () => [sheet.isOpen, sheet.editId, sheet.mode] as const,
  ([open]) => {
    if (!open) return;
    name.value = existing.value?.label || "";
    useMapPin.value = false;
  },
);

function applyPreset(label: string) {
  name.value = label;
}

function confirmSave() {
  const label = name.value.trim();
  if (!label) {
    toast.error("Isi nama tempat");
    return;
  }
  if (!pinReady.value) {
    toast.error("Geser pin biru di peta dulu");
    return;
  }
  const usePin = !existing.value || useMapPin.value;
  const lat = usePin ? userLocation.lat : existing.value!.lat;
  const lng = usePin ? userLocation.long : existing.value!.lng;
  const address = usePin ? userLocation.fullAddress : existing.value!.address;
  const place = savePlace({
    id: sheet.editId || undefined,
    label,
    lat,
    lng,
    address,
  });
  sheet.onClose();
  if (place) toast.success(`${place.label} tersimpan`);
}

function confirmRemove() {
  const id = sheet.editId || existing.value?.id;
  const label = existing.value?.label || name.value.trim() || "Tempat";
  if (!id) return;
  clearPlace(id);
  sheet.onClose();
  toast.success(`${label} dihapus`);
}
</script>

<template>
  <CoreSheet
    :is-open="sheet.isOpen"
    :snap-points="[420, 0]"
    is-overlay
    @close="sheet.onClose()"
  >
    <template #header>
      <div class="ui-sheet-header px-4">
        <h1 class="ui-sheet-title">
          {{ sheet.mode === "remove" ? "Hapus tempat?" : existing ? "Ubah tempat" : "Simpan tempat" }}
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
          style="background: var(--bb-bg-muted); border-radius: var(--bb-radius-card)"
        >
          <p class="m-0 text-[11px] font-medium" style="color: var(--bb-text-tertiary)">Lokasi</p>
          <p class="m-0 mt-1 text-[14px] font-semibold leading-snug" style="color: var(--bb-text)">
            {{ addressPreview }}
          </p>
        </div>

        <label class="block">
          <span class="m-0 text-[11px] font-medium" style="color: var(--bb-text-tertiary)">Nama tempat</span>
          <input
            v-model="name"
            type="text"
            maxlength="40"
            placeholder="Mis. Rumah, Kantor, Kos…"
            class="bb-place-input mt-1.5"
            autocomplete="off"
          >
        </label>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="p in PLACE_PRESETS"
            :key="p.label"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-semibold rounded-full"
            :class="name.trim().toLowerCase() === p.label.toLowerCase() ? 'chip-on' : 'chip-off'"
            @click="applyPreset(p.label)"
          >
            <Icon :icon="p.icon" class="text-sm" />
            {{ p.label }}
          </button>
        </div>

        <p
          v-if="!pinReady"
          class="m-0 text-[12px] font-medium"
          style="color: var(--bb-danger)"
        >
          Belum ada pin. Geser pin biru di peta dulu.
        </p>

        <button
          type="button"
          class="btn-report text-sm !mb-0 w-full"
          :disabled="!canSave"
          @click="confirmSave"
        >
          <Icon icon="lucide:bookmark" class="w-4 h-4 mr-1.5" />
          Simpan
        </button>

        <button
          v-if="existing && pinReady"
          type="button"
          class="w-full text-[12px] font-medium py-1"
          style="color: var(--bb-text-secondary)"
          @click="useMapPin = !useMapPin"
        >
          {{ useMapPin ? "Lokasi: pin peta sekarang" : "Pindahkan ke pin peta" }}
        </button>

        <button
          v-if="existing"
          type="button"
          class="w-full text-sm font-semibold py-2"
          style="color: var(--bb-danger)"
          @click="sheet.openRemove(existing.id)"
        >
          Hapus tempat ini
        </button>
      </template>

      <template v-else>
        <p class="m-0 text-[13px] leading-relaxed" style="color: var(--bb-text-secondary)">
          {{ existing?.label || "Tempat ini" }} akan dihapus dari favorit.
        </p>
        <button
          type="button"
          class="w-full h-11 text-sm font-semibold text-white rounded-lg"
          style="background: var(--bb-danger)"
          @click="confirmRemove"
        >
          Hapus
        </button>
        <button
          type="button"
          class="w-full text-sm font-semibold py-2.5"
          style="color: var(--bb-text-secondary)"
          @click="sheet.onClose()"
        >
          Batal
        </button>
      </template>
    </div>
  </CoreSheet>
</template>

<style scoped>
.bb-place-input {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.7rem 0.85rem;
  border: 0;
  outline: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--bb-text);
  background: var(--bb-bg-muted);
  border-radius: var(--bb-radius-control);
}

.bb-place-input::placeholder {
  font-weight: 500;
  color: var(--bb-text-tertiary);
}

.chip-on {
  background: var(--bb-text);
  color: var(--bb-bg-surface);
}
.chip-off {
  background: var(--bb-bg-muted);
  color: var(--bb-text);
}
</style>
