<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: "unit", title: "Arsip Feedback", keepalive: true });

const { unitHeaders, logout } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const { data, pending, error, refresh: refreshFeedback } = await useAsyncData(
  "unit-feedback",
  () => $fetch<{ data: any[] }>(`${baseUrl}/api/v1/unit/feedback`, { headers: unitHeaders() }),
  { server: false }
);

const refresh = useSoftRefresh(refreshFeedback);
const showSkeleton = computed(() => isInitialPending(pending.value, data.value));

watch(error, (err: any) => {
  if (err?.status === 401 || err?.statusCode === 401) logout();
});

const feedbacks = computed(() => data.value?.data ?? []);

const search = usePersistedQueryParam("bb-unit-feedback-q", "q", "", { syncQuery: false });
const filteredFeedbacks = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return feedbacks.value;
  return feedbacks.value.filter(
    (f: any) =>
      f.comment?.toLowerCase().includes(q) ||
      String(f.call_type || "").toLowerCase().includes(q),
  );
});

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
    <div class="page-subheader">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink
            to="/unit/settings"
            class="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors shrink-0"
          >
            <Icon icon="lucide:arrow-left" class="text-neutral-700 text-sm" />
          </NuxtLink>
          <div class="min-w-0">
            <h1 class="page-subheader-title">Arsip Feedback</h1>
            <p class="page-subheader-desc truncate">
              Semua penilaian warga · biasanya dari detail pesanan
            </p>
          </div>
        </div>
        <UiButton
          variant="secondary"
          size="sm"
          class="w-full sm:w-auto justify-center"
          :disabled="pending && !!data"
          @click="refresh()"
        >
          <Icon icon="lucide:refresh-cw" class="text-sm" :class="{ 'animate-spin': pending }" />
          Refresh
        </UiButton>
      </div>
    </div>

    <div class="p-4 sm:p-6 space-y-5">

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <template v-if="showSkeleton">
          <div
            v-for="i in 3"
            :key="`usk-${i}`"
            class="bg-white rounded-xl border border-neutral-200 p-4 text-center space-y-2"
          >
            <div class="soft-skel h-2.5 w-16 mx-auto" />
            <div class="soft-skel h-7 w-12 mx-auto" />
          </div>
        </template>
        <template v-else>
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
        </template>
      </div>

      <!-- Feedback list -->
      <UiTableCard
        title="Riwayat Feedback"
        :badge="filteredFeedbacks.length"
        description="Penilaian layanan dari pelapor"
      >
        <template #actions>
          <UiSearchInput
            v-model="search"
            placeholder="Cari..."
            class="w-28 sm:w-40 shrink-0"
          />
        </template>

        <div v-if="showSkeleton" class="divide-y divide-neutral-100">
          <div
            v-for="i in 4"
            :key="`fbrow-${i}`"
            class="px-4 sm:px-5 py-4 space-y-3"
          >
            <div class="flex items-center gap-2">
              <div class="soft-skel h-5 rounded-full w-20" />
              <div class="soft-skel h-5 rounded-full w-24" />
              <div class="soft-skel h-5 rounded-full w-16" />
              <div class="soft-skel h-2.5 w-16 ml-auto" />
            </div>
            <div class="soft-skel h-3 w-4/5" />
          </div>
        </div>

        <div v-else-if="!filteredFeedbacks.length" class="py-2">
          <UiEmptyState title="Belum ada feedback" description="Feedback akan muncul di sini setelah layanan selesai ditangani.">
            <template #icon>
              <Icon icon="lucide:message-square-off" class="text-neutral-400 text-2xl" />
            </template>
          </UiEmptyState>
        </div>

        <div v-else class="divide-y divide-neutral-100">
          <div
            v-for="fb in filteredFeedbacks"
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
      </UiTableCard>

    </div>
  </div>
</template>
