<script setup lang="ts">
import { Icon } from "@iconify/vue";
definePageMeta({ title: "Feedback Masyarakat" });

function convertPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return digits;
}

const { authGet } = useApi();

const { data: statsData, refresh: refreshStats } = await useAsyncData("fb-stats", () =>
  authGet<{ data: { total: number; unit_helpful_rate: number; app_helpful_rate: number } }>("/api/v1/feedback/stats")
);

const { data: groupedData, refresh: refreshGrouped } = await useAsyncData("fb-grouped", () =>
  authGet<{ data: any[] }>("/api/v1/feedback/grouped")
);

const stats = computed(() => statsData.value?.data);
const groups = computed(() => groupedData.value?.data ?? []);

// ── Row dropdown ──────────────────────────────────────────────────────────────
const dropdownItem = ref<any>(null);
const dropdownPos = ref({ top: 0, right: 0 });
function toggleDropdown(item: any, event: MouseEvent) {
  if (dropdownItem.value?.emergency_uuid === item.emergency_uuid) { dropdownItem.value = null; return; }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  dropdownPos.value = { top: rect.bottom + 4, right: window.innerWidth - rect.right };
  dropdownItem.value = item;
}

// ── Detail modal ──────────────────────────────────────────────────────────────
const detailUnit = ref<any>(null);
const detailFeedbacks = ref<any[]>([]);
const detailLoading = ref(false);
const showDetail = ref(false);

async function openDetail(group: any) {
  detailUnit.value = group;
  showDetail.value = true;
  detailLoading.value = true;
  try {
    const res = await authGet<{ data: any[] }>(`/api/v1/feedback/unit/${group.emergency_uuid}`);
    detailFeedbacks.value = res.data ?? [];
  } finally {
    detailLoading.value = false;
  }
}

// ── WhatsApp send ─────────────────────────────────────────────────────────────
const { get } = useApi();
const emergencies = ref<any[]>([]);

onMounted(async () => {
  const res = await get<{ data: any[] }>("/api/v1/emergency/").catch(() => ({ data: [] }));
  emergencies.value = res.data ?? [];
});

function getUnitWhatsapp(emergencyUUID: string): string {
  const unit = emergencies.value.find((e: any) => e.id === emergencyUUID);
  return unit?.contact?.whatsapp ?? "";
}

function buildWAMessage(group: any): string {
  const lines = [
    `Halo ${group.unit_name},`,
    ``,
    `Berikut ringkasan feedback pengguna ButuhBantuan:`,
    `📊 Total penilaian: ${group.total}`,
    `✅ Unit membantu: ${Math.round(group.unit_helpful_rate)}% (${group.unit_helpful_count} dari ${group.total})`,
    `📱 Aplikasi berguna: ${Math.round(group.app_helpful_rate)}%`,
  ];

  const comments = (group.recent_comments ?? []).filter(Boolean);
  if (comments.length) {
    lines.push(``, `💬 Komentar terbaru:`);
    comments.forEach((c: string) => lines.push(`• "${c}"`));
  }

  lines.push(``, `Terima kasih atas pelayanannya! 🙏`, `- Tim ButuhBantuan`);
  return lines.join("\n");
}

function sendWA(group: any) {
  const rawNumber = getUnitWhatsapp(group.emergency_uuid);
  if (!rawNumber) {
    alert("Nomor WhatsApp unit ini tidak tersedia.");
    return;
  }
  const number = convertPhoneNumber(rawNumber);
  const message = encodeURIComponent(buildWAMessage(group));
  window.open(`https://wa.me/${number}?text=${message}`, "_blank");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rateColor(rate: number) {
  if (rate >= 70) return "bg-green-500";
  if (rate >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

function rateTextColor(rate: number) {
  if (rate >= 70) return "text-green-700";
  if (rate >= 40) return "text-yellow-700";
  return "text-red-600";
}
</script>

<template>
  <div>
    <!-- Dropdown overlay -->
    <div v-if="dropdownItem" class="fixed inset-0 z-[98]" @click="dropdownItem = null" />

    <!-- Page header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-neutral-900">Feedback Masyarakat</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Penilaian dari pengguna setelah menghubungi layanan darurat</p>
        </div>
        <UiButton variant="secondary" @click="refreshGrouped(); refreshStats()">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Refresh
        </UiButton>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-6">

      <!-- Stats cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Total Penilaian</p>
          <p class="text-3xl font-bold text-neutral-900">{{ stats?.total ?? 0 }}</p>
          <p class="text-xs text-neutral-400 mt-1">dari pengguna aplikasi</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Unit Membantu</p>
          <p class="text-3xl font-bold text-green-600">{{ Math.round(stats?.unit_helpful_rate ?? 0) }}%</p>
          <div class="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div class="h-full rounded-full bg-green-500 transition-all" :style="{ width: `${stats?.unit_helpful_rate ?? 0}%` }" />
          </div>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-5">
          <p class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Aplikasi Berguna</p>
          <p class="text-3xl font-bold text-primary-600">{{ Math.round(stats?.app_helpful_rate ?? 0) }}%</p>
          <div class="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div class="h-full rounded-full bg-primary-500 transition-all" :style="{ width: `${stats?.app_helpful_rate ?? 0}%` }" />
          </div>
        </div>
      </div>

      <!-- Grouped table -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-neutral-100">
          <h2 class="text-sm font-semibold text-neutral-900">Per Unit Layanan</h2>
          <p class="text-xs text-neutral-400 mt-0.5">{{ groups.length }} unit dengan penilaian</p>
        </div>

        <div v-if="!groups.length" class="py-4">
          <UiEmptyState title="Belum ada feedback" description="Penilaian akan muncul setelah pengguna menghubungi layanan darurat.">
            <template #icon>
              <Icon icon="lucide:message-square" class="text-neutral-400 text-2xl" />
            </template>
          </UiEmptyState>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <th class="px-5 py-3 text-left">Unit Layanan</th>
                <th class="px-5 py-3 text-center">Total</th>
                <th class="px-5 py-3 text-left hidden sm:table-cell">Unit Membantu</th>
                <th class="px-5 py-3 text-left hidden md:table-cell">App Berguna</th>
                <th class="px-5 py-3 text-left hidden lg:table-cell">Komentar Terbaru</th>
                <th class="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100">
              <tr
                v-for="group in groups"
                :key="group.emergency_uuid"
                class="hover:bg-neutral-50 transition-colors"
              >
                <!-- Unit name -->
                <td class="px-5 py-4">
                  <p class="font-medium text-neutral-900">{{ group.unit_name }}</p>
                  <p class="text-xs text-neutral-400 mt-0.5">{{ group.unit_helpful_count }} membantu dari {{ group.total }}</p>
                </td>

                <!-- Total -->
                <td class="px-5 py-4 text-center">
                  <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 text-sm font-bold text-neutral-700">
                    {{ group.total }}
                  </span>
                </td>

                <!-- Unit helpful rate -->
                <td class="px-5 py-4 hidden sm:table-cell">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden min-w-[60px]">
                      <div :class="['h-full rounded-full transition-all', rateColor(group.unit_helpful_rate)]" :style="{ width: `${group.unit_helpful_rate}%` }" />
                    </div>
                    <span :class="['text-xs font-semibold w-9 text-right', rateTextColor(group.unit_helpful_rate)]">
                      {{ Math.round(group.unit_helpful_rate) }}%
                    </span>
                  </div>
                </td>

                <!-- App helpful rate -->
                <td class="px-5 py-4 hidden md:table-cell">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden min-w-[60px]">
                      <div :class="['h-full rounded-full transition-all', rateColor(group.app_helpful_rate)]" :style="{ width: `${group.app_helpful_rate}%` }" />
                    </div>
                    <span :class="['text-xs font-semibold w-9 text-right', rateTextColor(group.app_helpful_rate)]">
                      {{ Math.round(group.app_helpful_rate) }}%
                    </span>
                  </div>
                </td>

                <!-- Recent comment snippet -->
                <td class="px-5 py-4 hidden lg:table-cell max-w-[220px]">
                  <p v-if="group.recent_comments?.length" class="text-xs text-neutral-500 truncate italic">
                    "{{ group.recent_comments[0] }}"
                  </p>
                  <span v-else class="text-xs text-neutral-300">—</span>
                </td>

                <!-- Actions -->
                <td class="px-5 py-4 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-4 focus:ring-neutral-100 transition-colors"
                    @click.stop="toggleDropdown(group, $event)"
                  >
                    Aksi
                    <Icon icon="lucide:chevron-down" class="text-xs text-neutral-500" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Row dropdown (teleported) -->
    <Teleport to="body">
      <div
        v-if="dropdownItem"
        class="fixed z-[99] w-52 bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden py-1"
        :style="{ top: dropdownPos.top + 'px', right: dropdownPos.right + 'px' }"
        @click.stop
      >
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="openDetail(dropdownItem); dropdownItem = null"
        >
          <Icon icon="lucide:message-square-text" class="text-neutral-500 text-base shrink-0" />
          Lihat Komentar
        </button>
        <button
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          @click="sendWA(dropdownItem); dropdownItem = null"
        >
          <Icon icon="mdi:whatsapp" class="text-green-600 text-base shrink-0" />
          Kirim Ringkasan WA
        </button>
      </div>
    </Teleport>

    <!-- Detail modal -->
    <UiModal v-model:open="showDetail" :title="detailUnit?.unit_name ?? ''" description="Semua penilaian dari pengguna untuk unit ini.">
      <template #trigger><span /></template>

      <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div v-if="detailLoading" class="flex items-center justify-center py-8 gap-2 text-neutral-400 text-sm">
          <UiSpinner size="sm" />
          Memuat...
        </div>

        <template v-else-if="detailFeedbacks.length">
          <div
            v-for="fb in detailFeedbacks"
            :key="fb.id"
            class="p-3 rounded-xl border border-neutral-100 bg-neutral-50 space-y-2"
          >
            <!-- Badges row -->
            <div class="flex items-center gap-2 flex-wrap">
              <span :class="['inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', fb.unit_helpful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600']">
                <Icon :icon="fb.unit_helpful ? 'lucide:thumbs-up' : 'lucide:thumbs-down'" class="text-[11px]" />
                {{ fb.unit_helpful ? 'Unit membantu' : 'Unit tidak membantu' }}
              </span>
              <span
                v-if="fb.app_helpful !== null"
                :class="['inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', fb.app_helpful ? 'bg-primary-50 text-primary-700' : 'bg-neutral-200 text-neutral-600']"
              >
                <Icon icon="lucide:smartphone" class="text-[11px]" />
                App {{ fb.app_helpful ? 'berguna' : 'tidak berguna' }}
              </span>
              <span class="ml-auto text-xs text-neutral-400">
                {{ fb.call_type === 'whatsapp' ? 'WA' : 'Telepon' }}
              </span>
            </div>
            <!-- Comment -->
            <p v-if="fb.comment" class="text-sm text-neutral-700 italic">"{{ fb.comment }}"</p>
            <p class="text-xs text-neutral-400">{{ new Date(fb.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</p>
          </div>
        </template>

        <UiEmptyState v-else title="Belum ada komentar" description="Pengguna belum meninggalkan komentar untuk unit ini.">
          <template #icon>
            <Icon icon="lucide:message-square-dashed" class="text-neutral-400 text-2xl" />
          </template>
        </UiEmptyState>
      </div>

      <template #footer>
        <UiButton variant="secondary" size="sm" @click="showDetail = false">Tutup</UiButton>
        <UiButton size="sm" variant="ghost" class="text-green-700 hover:bg-green-50" @click="sendWA(detailUnit); showDetail = false">
          <Icon icon="mdi:whatsapp" class="text-base text-green-600" />
          Kirim Ringkasan WA
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
