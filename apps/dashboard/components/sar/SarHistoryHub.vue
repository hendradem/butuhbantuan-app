<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { SarAppConfig, SarMission } from "~/composables/useSarApi";

defineProps<{
  appStatus: SarAppConfig | null;
  missions: SarMission[];
  toggling?: boolean;
}>();

const emit = defineEmits<{
  disable: [];
  onboard: [];
  open: [id: string];
  openActive: [];
}>();
</script>

<template>
  <div class="max-w-2xl mx-auto pt-6 space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Aplikasi aktif</p>
        <h1 class="text-xl font-semibold text-neutral-900">History ESAR</h1>
        <p class="text-sm text-neutral-500 mt-1">
          Lihat arsip operasi lain dulu. Setup misi sendiri hanya jika belum onboarding.
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-neutral-500 hover:text-neutral-800 underline"
        :disabled="toggling"
        @click="emit('disable')"
      >
        Nonaktifkan
      </button>
    </div>

    <div
      v-if="!appStatus?.onboarded"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-amber-900">
        Belum ada misi aktif Anda. Bisa jelajahi history dulu, atau mulai onboarding.
      </p>
      <UiButton size="sm" @click="emit('onboard')">
        Mulai onboarding
      </UiButton>
    </div>
    <div
      v-else
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-emerald-900">
        Misi aktif siap.
        <span v-if="appStatus.active_mission_id" class="opacity-80">ID: {{ appStatus.active_mission_id }}</span>
      </p>
      <UiButton
        size="sm"
        variant="secondary"
        :disabled="!appStatus.active_mission_id"
        @click="emit('openActive')"
      >
        Buka misi aktif
      </UiButton>
    </div>

    <ul class="space-y-2">
      <li
        v-for="m in missions"
        :key="m.id"
        class="rounded-xl border border-neutral-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:border-neutral-300"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold text-neutral-900 truncate">{{ m.name }}</p>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ m.area || "—" }} ·
            <span :class="m.kind === 'archive' ? 'text-amber-700' : 'text-emerald-700'">
              {{ m.kind === "archive" ? "arsip ESAR" : "live" }}
            </span>
            · {{ m.status }}
            <span v-if="m.share_token" class="text-violet-600"> · shared</span>
          </p>
        </div>
        <UiButton size="sm" variant="secondary" @click="emit('open', m.id)">
          Lihat
        </UiButton>
      </li>
      <li v-if="!missions.length" class="text-sm text-neutral-500 py-6 text-center">
        Belum ada history. Restart API lalu refresh, atau mulai onboarding.
      </li>
    </ul>

    <div v-if="appStatus?.onboarded" class="pt-1">
      <button type="button" class="text-xs text-violet-700 hover:underline" @click="emit('onboard')">
        Reset / setup ulang master data…
      </button>
    </div>
  </div>
</template>
