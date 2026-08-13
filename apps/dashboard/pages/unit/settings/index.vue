<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { toast } from "vue3-hot-toast";

definePageMeta({ layout: "unit", title: "Pengaturan", keepalive: true });

const { unitHeaders } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

// ── Profile ───────────────────────────────────────────────────────────────────
const { data: profile, pending: profilePending, refresh: refreshProfile } = await useAsyncData(
  "unit-settings-profile",
  () => $fetch<{ data: any }>(`${baseUrl}/api/v1/unit/profile`, { headers: unitHeaders() })
    .then(r => r.data).catch(() => null),
  { server: false }
);

const refresh = useSoftRefresh(refreshProfile);
const showProfileSkeleton = computed(() => isInitialPending(profilePending.value, profile.value));

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
    <div class="page-subheader">
      <h1 class="page-subheader-title">Pengaturan</h1>
      <p class="page-subheader-desc">Konfigurasi layanan dan armada unit</p>
    </div>

    <div class="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-5">

      <UiCard
        title="Status Layanan"
        description="Aktifkan agar unit dapat menerima pesanan"
      >
        <div v-if="showProfileSkeleton" class="soft-skel h-8 rounded-lg" />
        <button
          v-else
          type="button"
          :disabled="toggling"
          :class="[
            'w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60',
            isActive
              ? 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
              : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50',
          ]"
          @click="handleToggle"
        >
          <div class="flex items-center gap-3">
            <span :class="['h-2 w-2 rounded-full shrink-0', isActive ? 'bg-green-500' : 'bg-neutral-400']" />
            <span>{{ toggling ? 'Menyimpan...' : (isActive ? 'Layanan Aktif' : 'Layanan Nonaktif') }}</span>
          </div>
          <span class="text-sm font-normal text-neutral-500">Ketuk untuk ubah</span>
        </button>
        <p class="text-sm text-neutral-500 mt-2">
          {{ isActive
            ? 'Unit saat ini aktif dan dapat menerima pesanan dari warga.'
            : 'Unit tidak aktif. Pesanan baru tidak akan diteruskan ke unit ini.'
          }}
        </p>
      </UiCard>

      <UiCard
        title="Ketersediaan Armada"
        description="Atur jumlah armada yang tersedia untuk bertugas"
      >
        <div v-if="showProfileSkeleton" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <div class="soft-skel h-3 w-20" />
              <div class="soft-skel h-8 rounded-lg" />
            </div>
            <div class="space-y-2">
              <div class="soft-skel h-3 w-28" />
              <div class="soft-skel h-8 rounded-lg" />
            </div>
          </div>
          <div class="soft-skel h-2 rounded-full w-full" />
          <div class="soft-skel h-8 rounded-lg w-full" />
        </div>
        <template v-else>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1.5">Total Armada</label>
              <UiInput
                :model-value="String(fleet.total)"
                type="number"
                min="0"
                class="text-center font-semibold"
                @update:model-value="fleet.total = Number($event) || 0"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1.5">Armada Tersedia</label>
              <UiInput
                :model-value="String(fleet.available)"
                type="number"
                min="0"
                :max="fleet.total"
                class="text-center font-semibold"
                @update:model-value="fleet.available = Number($event) || 0"
              />
            </div>
          </div>

          <div v-if="fleet.total > 0" class="space-y-1.5 mt-4">
            <div class="flex justify-between text-sm">
              <span class="text-neutral-500">Kapasitas terpakai</span>
              <span :class="['font-medium', fleet.available > 0 ? 'text-green-600' : 'text-emergency-600']">
                {{ fleet.available }} / {{ fleet.total }} tersedia
              </span>
            </div>
            <div class="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div
                :style="{ width: `${Math.min(100, Math.round((fleet.available / fleet.total) * 100))}%` }"
                :class="['h-2 rounded-full transition-all duration-300', fleet.available > 0 ? 'bg-green-500' : 'bg-emergency-500']"
              />
            </div>
          </div>

          <UiButton class="w-full mt-4" :loading="updatingFleet" @click="saveFleet">
            <Icon v-if="fleetSaved" icon="lucide:check-circle" class="text-sm" />
            <Icon v-else icon="lucide:save" class="text-sm" />
            {{ fleetSaved ? 'Tersimpan!' : 'Simpan Perubahan' }}
          </UiButton>
        </template>
      </UiCard>

      <UiCard
        title="Arsip"
        description="Feedback & laporan biasanya dari detail pesanan. Arsip untuk lihat semua."
        padding="none"
      >
        <div class="divide-y divide-neutral-200">
          <NuxtLink
            to="/unit/feedback"
            class="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-neutral-50 transition-colors"
          >
            <Icon icon="lucide:message-square" class="text-neutral-500 text-base shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-900">Arsip feedback warga</p>
              <p class="text-sm text-neutral-500 mt-0.5">Semua penilaian untuk unit Anda</p>
            </div>
            <Icon icon="lucide:chevron-right" class="text-neutral-400 text-sm" />
          </NuxtLink>
          <NuxtLink
            to="/unit/reports"
            class="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-neutral-50 transition-colors"
          >
            <Icon icon="lucide:file-text" class="text-neutral-500 text-base shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-900">Arsip laporan kejadian</p>
              <p class="text-sm text-neutral-500 mt-0.5">Daftar laporan per e-tiket</p>
            </div>
            <Icon icon="lucide:chevron-right" class="text-neutral-400 text-sm" />
          </NuxtLink>
        </div>
      </UiCard>

    </div>
  </div>
</template>
