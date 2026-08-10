<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{ mobileOpen?: boolean }>();
const emit = defineEmits<{ close: [] }>();

const route = useRoute();
const { collapsed, toggle } = useSidebar();

interface NavItem { label: string; to: string; icon: string }
interface NavGroup { label?: string; items: NavItem[] }

const groups: NavGroup[] = [
  {
    items: [
      { label: "Overview", to: "/", icon: "lucide:layout-dashboard" },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Layanan Darurat",  to: "/emergencies",    icon: "lucide:shield-check" },
      { label: "Jenis Layanan",    to: "/emergency-types", icon: "lucide:tag" },
      { label: "Wilayah Tercakup", to: "/regions",         icon: "lucide:map-pin" },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Pesanan Masuk",    to: "/orders",          icon: "lucide:clipboard-list" },
      { label: "Alert SOS",        to: "/sos",             icon: "lucide:siren" },
      { label: "Laporan Kejadian", to: "/reports",         icon: "lucide:file-text" },
    ],
  },
  {
    label: "Insight",
    items: [
      { label: "Analitik",         to: "/analytics",       icon: "lucide:bar-chart-2" },
      { label: "Feedback",         to: "/feedback",        icon: "lucide:message-square-text" },
    ],
  },
];

function isActive(to: string) {
  return to === "/" ? route.path === "/" : route.path.startsWith(to);
}

function onNavClick() {
  emit("close"); // close mobile drawer on navigation
}
</script>

<template>
  <aside
    :class="[
      'flex flex-col h-full bg-white border-r border-neutral-200 transition-all duration-300 shrink-0',
      collapsed ? 'w-[60px]' : 'w-64',
    ]"
  >
    <!-- Brand + desktop collapse toggle -->
    <div class="h-[60px] flex items-center gap-3 px-3.5 border-b border-neutral-100 shrink-0">
      <div class="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shrink-0">
        <Icon icon="lucide:siren" class="text-white text-base" />
      </div>
      <div v-if="!collapsed" class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-neutral-900 leading-none truncate">ButuhBantuan</p>
        <p class="text-xs text-neutral-400 leading-none mt-1">Admin Panel</p>
      </div>
      <!-- Desktop: collapse toggle -->
      <button
        class="hidden lg:flex w-6 h-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-auto shrink-0"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggle"
      >
        <Icon :icon="collapsed ? 'lucide:chevrons-right' : 'lucide:chevrons-left'" class="text-sm" />
      </button>
      <!-- Mobile: close button -->
      <button
        class="lg:hidden w-7 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-auto shrink-0"
        @click="emit('close')"
      >
        <Icon icon="lucide:x" class="text-base" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
      <div v-for="(group, gi) in groups" :key="gi" class="space-y-0.5">
        <p
          v-if="group.label && !collapsed"
          class="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400 select-none"
        >
          {{ group.label }}
        </p>
        <div v-else-if="group.label && collapsed" class="border-t border-neutral-100 my-2" />

        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : undefined"
          :class="[
            'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group',
            collapsed ? 'justify-center px-0 py-2.5 w-full' : 'px-2.5 py-2',
            isActive(item.to)
              ? 'bg-primary-50 text-primary-700'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
          ]"
          @click="onNavClick"
        >
          <Icon
            :icon="item.icon"
            :class="[
              'text-[18px] shrink-0',
              isActive(item.to) ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600',
            ]"
          />
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- User section -->
    <div :class="['shrink-0 border-t border-neutral-100 p-2', collapsed ? 'flex justify-center' : '']">
      <div :class="['flex items-center rounded-lg p-2 hover:bg-neutral-100 transition-colors', collapsed ? 'justify-center' : 'gap-2.5']">
        <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <Icon icon="lucide:user" class="text-primary-600 text-sm" />
        </div>
        <div v-if="!collapsed" class="min-w-0">
          <p class="text-sm font-semibold text-neutral-800 leading-none truncate">Admin</p>
          <p class="text-xs text-neutral-400 leading-none mt-0.5">Administrator</p>
        </div>
        <Icon v-if="!collapsed" icon="lucide:chevrons-up-down" class="text-neutral-300 text-sm ml-auto shrink-0" />
      </div>
    </div>
  </aside>
</template>
