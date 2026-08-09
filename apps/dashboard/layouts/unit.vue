<script setup lang="ts">
import { Icon } from "@iconify/vue";

const { logout, unitHeaders, unitUsername, emergencyUUID } = useUnitAuth();
const config = useRuntimeConfig();
const baseUrl = config.public.apiBaseUrl as string;

const { data: profile } = await useAsyncData(
  "unit-profile",
  () => $fetch<{ data: { unit_name: string; emergency_type: string; address: any; username: string } }>(
    `${baseUrl}/api/v1/unit/profile`,
    { headers: unitHeaders() }
  ).then(r => r.data).catch(() => null),
  { server: false }
);
</script>

<template>
  <div class="flex h-screen bg-neutral-50 overflow-hidden font-sans">
    <!-- Sidebar -->
    <aside class="flex flex-col h-full bg-white border-r border-neutral-200 w-[220px] shrink-0">
      <!-- Brand -->
      <div class="h-[60px] flex items-center gap-3 px-3.5 border-b border-neutral-100 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
          <Icon icon="lucide:siren" class="text-white text-base" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-neutral-900 leading-none truncate">ButuhBantuan</p>
          <p class="text-xs text-neutral-400 leading-none mt-1">Unit Panel</p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-2">
        <NuxtLink
          to="/unit/orders"
          class="flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-colors text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          active-class="bg-primary-50 text-primary-700"
        >
          <Icon icon="lucide:clipboard-list" class="text-[18px] shrink-0" />
          <span class="truncate">Pesanan Masuk</span>
        </NuxtLink>
        <NuxtLink
          to="/unit/feedback"
          class="flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-colors text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          active-class="bg-primary-50 text-primary-700"
        >
          <Icon icon="lucide:message-square" class="text-[18px] shrink-0" />
          <span class="truncate">Feedback</span>
        </NuxtLink>
      </nav>

      <!-- Profile -->
      <div class="shrink-0 border-t border-neutral-100 p-3 space-y-3">
        <!-- Unit info -->
        <div class="bg-neutral-50 rounded-xl p-3 space-y-1.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emergency-100 flex items-center justify-center shrink-0">
              <Icon icon="lucide:shield" class="text-emergency-600 text-sm" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-neutral-900 leading-none truncate">
                {{ profile?.unit_name ?? '...' }}
              </p>
              <p class="text-[11px] text-neutral-400 mt-0.5 leading-none truncate">
                {{ profile?.emergency_type ?? '' }}
              </p>
            </div>
          </div>
          <div v-if="profile?.address?.regency" class="flex items-center gap-1 text-[11px] text-neutral-400">
            <Icon icon="lucide:map-pin" class="text-[10px] shrink-0" />
            <span class="truncate">{{ profile.address.regency }}</span>
          </div>
        </div>

        <!-- User row -->
        <div class="flex items-center gap-2 px-1">
          <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Icon icon="lucide:user" class="text-primary-600 text-xs" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-neutral-700 truncate">{{ unitUsername ?? profile?.username ?? '—' }}</p>
            <p class="text-[11px] text-neutral-400 leading-none">Operator unit</p>
          </div>
          <button
            class="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-emergency-600 hover:bg-emergency-50 transition-colors"
            title="Keluar"
            @click="logout"
          >
            <Icon icon="lucide:log-out" class="text-sm" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <header class="h-[60px] shrink-0 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-neutral-200">
        <p class="text-sm font-semibold text-neutral-900">
          {{ profile?.unit_name ? `Dashboard – ${profile.unit_name}` : 'Dashboard Unit' }}
        </p>
        <div v-if="emergencyUUID" class="text-[11px] text-neutral-400 font-mono hidden sm:block truncate max-w-[260px]">
          {{ emergencyUUID }}
        </div>
      </header>
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
