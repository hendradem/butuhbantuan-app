<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: "unit", title: "Pengaturan" });

const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

// ── Profile ───────────────────────────────────────────────────────────────────
const { data: profile, pending: profilePending, refresh } = await useAsyncData(
  "unit-settings-profile",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);

// ── Availability toggle ───────────────────────────────────────────────────────
const { isActive, toggling, toggle, initFromProfile } = useUnitAvailability();
watch(() => profile.value?.operational, (op) => { initFromProfile(op); }, { immediate: true });

async function handleToggle() {
  await toggle();
  toast.success(isActive.value ? "Layanan ditandai Aktif" : "Layanan ditandai Nonaktif");
}

// ── Fleet management ──────────────────────────────────────────────────────────
const fleet = reactive({ total: 0, available: 0 });
const updatingFleet = ref(false);
const fleetSaved = ref(false);

watch(() => profile.value?.fleet, (f) => {
  if (f) { fleet.total = f.total; fleet.available = f.available; }
}, { immediate: true });

async function saveFleet() {
  if (fleet.available > fleet.total) {
    toast.error("Armada tersedia tidak boleh melebihi total armada");
    return;
  }
  updatingFleet.value = true;
  try {
    await $fetch(`${baseUrl}/api/v1/unit/fleet`, {
      method: "PATCH",
      headers: { ...unitHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ total: fleet.total, available: fleet.available }),
    });
    fleetSaved.value = true;
    setTimeout(() => { fleetSaved.value = false; }, 2500);
    await refresh();
    toast.success("Ketersediaan armada berhasil disimpan");
  } catch (err: any) {
    toast.error(err?.data?.message ?? "Gagal menyimpan armada");
  } finally {
    updatingFleet.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <h1 class="text-xl font-semibold text-neutral-900">Pengaturan</h1>
      <p class="text-sm text-neutral-500 mt-0.5">Konfigurasi layanan dan armada unit</p>
    </div>

    <div class="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Status Layanan -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <div class="flex items-center gap-2">
            <Icon icon="lucide:power" class="text-neutral-500 text-base" />
            <div>
              <h2 class="text-sm font-semibold text-neutral-900">Status Layanan</h2>
              <p class="text-xs text-neutral-500 mt-0.5">Aktifkan agar unit dapat menerima pesanan</p>
            </div>
          </div>
        </div>
        <div class="px-5 py-5">
          <div v-if="profilePending" class="h-12 bg-neutral-100 animate-pulse rounded-xl" />
          <button
            v-else
            :disabled="toggling"
            :class="[
              'w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-60',
              isActive
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-neutral-100 border-neutral-300 text-neutral-600 hover:bg-neutral-200',
            ]"
            @click="handleToggle"
          >
            <div class="flex items-center gap-3">
              <span :class="['w-3 h-3 rounded-full shrink-0 transition-colors', isActive ? 'bg-green-500' : 'bg-neutral-400']" />
              <span>{{ toggling ? 'Menyimpan...' : (isActive ? 'Layanan Aktif' : 'Layanan Nonaktif') }}</span>
            </div>
            <span class="text-xs font-normal opacity-60">Ketuk untuk ubah</span>
          </button>
          <p class="text-xs text-neutral-400 mt-2 px-1">
            {{ isActive
              ? 'Unit saat ini aktif dan dapat menerima pesanan dari warga.'
              : 'Unit tidak aktif. Pesanan baru tidak akan diteruskan ke unit ini.'
            }}
          </p>
        </div>
      </div>

      <!-- Ketersediaan Armada -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <div class="flex items-center gap-2">
            <Icon icon="lucide:truck" class="text-neutral-500 text-base" />
            <div>
              <h2 class="text-sm font-semibold text-neutral-900">Ketersediaan Armada</h2>
              <p class="text-xs text-neutral-500 mt-0.5">Atur jumlah armada yang tersedia untuk bertugas</p>
            </div>
          </div>
        </div>
        <div class="px-5 py-5 space-y-4">
          <div v-if="profilePending" class="space-y-3 animate-pulse">
            <div class="h-12 bg-neutral-100 rounded-lg" />
            <div class="h-12 bg-neutral-100 rounded-lg" />
          </div>
          <template v-else>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-neutral-600 mb-2">Total Armada</label>
                <input
                  v-model.number="fleet.total"
                  type="number"
                  min="0"
                  class="w-full text-center text-lg font-semibold border border-neutral-300 rounded-xl px-3 py-3 bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-neutral-600 mb-2">Armada Tersedia</label>
                <input
                  v-model.number="fleet.available"
                  type="number"
                  min="0"
                  :max="fleet.total"
                  class="w-full text-center text-lg font-semibold border border-neutral-300 rounded-xl px-3 py-3 bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <!-- Progress bar -->
            <div v-if="fleet.total > 0" class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-neutral-500">Kapasitas terpakai</span>
                <span :class="['font-semibold', fleet.available > 0 ? 'text-green-600' : 'text-emergency-600']">
                  {{ fleet.available }} / {{ fleet.total }} tersedia
                </span>
              </div>
              <div class="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                <div
                  :style="{ width: `${Math.min(100, Math.round((fleet.available / fleet.total) * 100))}%` }"
                  :class="['h-2.5 rounded-full transition-all duration-300', fleet.available > 0 ? 'bg-green-400' : 'bg-emergency-400']"
                />
              </div>
            </div>

            <UiButton class="w-full" :loading="updatingFleet" @click="saveFleet">
              <Icon v-if="fleetSaved" icon="lucide:check-circle" class="text-sm" />
              <Icon v-else icon="lucide:save" class="text-sm" />
              {{ fleetSaved ? 'Tersimpan!' : 'Simpan Perubahan' }}
            </UiButton>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>
