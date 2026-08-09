<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Feedback" });

const { unitHeaders, logout } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const { data, pending, error, refresh } = await useAsyncData(
  "unit-feedback",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/feedback`, { headers: unitHeaders() }),
  { server: false }
);

watch(error, (err: any) => {
  if (err?.status === 401 || err?.statusCode === 401) logout();
});

const feedbacks = computed(() => data.value?.data ?? []);

const stats = computed(() => {
  const list = feedbacks.value;
  const total = list.length;
  if (total === 0) return { total: 0, unitHelpfulRate: 0, appHelpfulRate: 0 };
  const unitHelpful = list.filter((f: any) => f.unit_helpful).length;
  const appAnswered = list.filter((f: any) => f.app_helpful !== null && f.app_helpful !== undefined);
  const appHelpful = appAnswered.filter((f: any) => f.app_helpful).length;
  return {
    total,
    unitHelpfulRate: Math.round((unitHelpful / total) * 100),
    appHelpfulRate: appAnswered.length > 0 ? Math.round((appHelpful / appAnswered.length) * 100) : 0,
  };
});

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const CALL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Telepon",
  unknown: "Lainnya",
};
</script>

<template>
  <div>
    <!-- Header -->
    <div class="border-b border-neutral-200 bg-white px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold text-neutral-900">Feedback Layanan</h1>
          <p class="text-sm text-neutral-500 mt-0.5">Penilaian dari masyarakat yang menggunakan layanan Anda</p>
        </div>
        <UiButton variant="secondary" size="sm" @click="refresh()">
          <Icon icon="lucide:refresh-cw" class="text-sm" />
          Refresh
        </UiButton>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-5">

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p class="text-xs text-neutral-500 font-medium">Total Feedback</p>
          <p class="text-2xl font-bold text-neutral-900 mt-1">{{ stats.total }}</p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p class="text-xs text-neutral-500 font-medium">Unit Membantu</p>
          <p class="text-2xl font-bold mt-1" :class="stats.unitHelpfulRate >= 70 ? 'text-green-600' : stats.unitHelpfulRate >= 40 ? 'text-yellow-600' : 'text-red-500'">
            {{ stats.unitHelpfulRate }}%
          </p>
        </div>
        <div class="bg-white rounded-xl border border-neutral-200 p-4 text-center">
          <p class="text-xs text-neutral-500 font-medium">Aplikasi Berguna</p>
          <p class="text-2xl font-bold mt-1" :class="stats.appHelpfulRate >= 70 ? 'text-green-600' : stats.appHelpfulRate >= 40 ? 'text-yellow-600' : 'text-red-500'">
            {{ stats.appHelpfulRate }}%
          </p>
        </div>
      </div>

      <!-- Feedback list -->
      <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div class="px-4 sm:px-5 py-3 border-b border-neutral-100 flex items-center gap-2">
          <Icon icon="lucide:message-square" class="text-neutral-400 text-sm" />
          <p class="text-sm font-medium text-neutral-700">Riwayat Feedback</p>
        </div>

        <div v-if="pending" class="flex items-center justify-center py-16 gap-2 text-neutral-400 text-sm">
          <UiSpinner size="sm" />
          Memuat...
        </div>

        <div v-else-if="!feedbacks.length" class="py-2">
          <UiEmptyState title="Belum ada feedback" description="Feedback akan muncul di sini setelah layanan selesai ditangani.">
            <template #icon>
              <Icon icon="lucide:message-square-off" class="text-neutral-400 text-2xl" />
            </template>
          </UiEmptyState>
        </div>

        <div v-else class="divide-y divide-neutral-100">
          <div
            v-for="fb in feedbacks"
            :key="fb.id"
            class="px-4 sm:px-5 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Unit helpful badge -->
                <span
                  :class="[
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    fb.unit_helpful
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      : 'bg-red-50 text-red-600 ring-1 ring-red-200',
                  ]"
                >
                  <Icon :icon="fb.unit_helpful ? 'lucide:thumbs-up' : 'lucide:thumbs-down'" class="text-[11px]" />
                  {{ fb.unit_helpful ? 'Membantu' : 'Tidak Membantu' }}
                </span>

                <!-- App helpful badge -->
                <span
                  v-if="fb.app_helpful !== null && fb.app_helpful !== undefined"
                  :class="[
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    fb.app_helpful
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
                  ]"
                >
                  <Icon :icon="fb.app_helpful ? 'lucide:smile' : 'lucide:frown'" class="text-[11px]" />
                  Aplikasi {{ fb.app_helpful ? 'Berguna' : 'Kurang Berguna' }}
                </span>

                <!-- Call type badge -->
                <span class="inline-flex items-center gap-1 text-xs text-neutral-400 font-medium px-2 py-0.5 rounded-full bg-neutral-100">
                  <Icon :icon="fb.call_type === 'whatsapp' ? 'mdi:whatsapp' : 'lucide:phone'" class="text-[11px]" />
                  {{ CALL_LABELS[fb.call_type] ?? fb.call_type }}
                </span>
              </div>

              <p class="text-xs text-neutral-400 shrink-0">{{ formatDate(fb.created_at) }}</p>
            </div>

            <p v-if="fb.comment" class="mt-2 text-sm text-neutral-600 leading-relaxed">
              "{{ fb.comment }}"
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
