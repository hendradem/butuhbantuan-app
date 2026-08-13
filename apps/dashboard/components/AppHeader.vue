<script setup lang="ts">
import { Icon } from "@iconify/vue";

const emit = defineEmits<{ toggleMobile: [] }>();

const route = useRoute();
const { logout } = useAuth();
const { toggle: toggleSidebar } = useSidebar();
const profileOpen = ref(false);
const profileRef = ref<HTMLElement | null>(null);

const pageTitle = computed(() => {
  const meta = route.meta as Record<string, string>;
  return meta.title ?? "Overview";
});

const breadcrumb = computed(() => {
  const meta = route.meta as Record<string, string>;
  if (route.path === "/") return [];
  return [{ label: "Home", to: "/" }, { label: meta.title ?? "" }];
});

// Close dropdown on outside click
function onClickOutside(e: MouseEvent) {
  if (profileRef.value && !profileRef.value.contains(e.target as Node)) {
    profileOpen.value = false;
  }
}
onMounted(() => document.addEventListener("mousedown", onClickOutside));
onUnmounted(() => document.removeEventListener("mousedown", onClickOutside));
</script>

<template>
  <header class="h-[60px] shrink-0 bg-white border-b border-neutral-200 flex items-center gap-3 px-4 z-30">
    <!-- Mobile hamburger -->
    <button
      class="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
      @click="emit('toggleMobile')"
    >
      <Icon icon="lucide:menu" class="text-[18px]" />
    </button>

    <!-- Desktop sidebar toggle -->
    <button
      class="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
      title="Toggle sidebar"
      @click="toggleSidebar"
    >
      <Icon icon="lucide:panel-left" class="text-[18px]" />
    </button>

    <!-- Breadcrumb / Title -->
    <div class="flex items-center gap-1.5 text-sm min-w-0 flex-1">
      <template v-if="breadcrumb.length">
        <template v-for="(seg, i) in breadcrumb" :key="i">
          <NuxtLink v-if="seg.to" :to="seg.to" class="hidden sm:block text-neutral-400 hover:text-neutral-700 transition-colors">
            {{ seg.label }}
          </NuxtLink>
          <Icon v-if="i < breadcrumb.length - 1" icon="lucide:chevron-right" class="hidden sm:block text-neutral-300 text-xs shrink-0" />
          <span class="font-semibold text-neutral-900 truncate">{{ breadcrumb[breadcrumb.length - 1]?.label }}</span>
        </template>
      </template>
      <span v-else class="font-semibold text-neutral-900">{{ pageTitle }}</span>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Notifications -->
      <NotificationCenter />

      <div class="w-px h-5 bg-neutral-200" />

      <!-- Profile dropdown -->
      <div ref="profileRef" class="relative">
        <button
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          @click="profileOpen = !profileOpen"
        >
          <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
            <Icon icon="lucide:user" class="text-primary-600 text-[12px]" />
          </div>
          <span class="hidden sm:block text-sm font-medium text-neutral-700">Admin</span>
          <Icon icon="lucide:chevron-down" class="hidden sm:block text-neutral-400 text-xs transition-transform" :class="{ 'rotate-180': profileOpen }" />
        </button>

        <!-- Dropdown menu -->
        <Transition name="dropdown">
          <div
            v-if="profileOpen"
            class="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-50"
          >
            <!-- User info -->
            <div class="px-3 py-2.5 border-b border-neutral-100">
              <p class="text-sm font-semibold text-neutral-900">Admin</p>
              <p class="text-xs text-neutral-400">Administrator</p>
            </div>

            <!-- Links -->
            <div class="py-1">
              <NuxtLink
                to="/settings"
                class="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                @click="profileOpen = false"
              >
                <Icon icon="lucide:settings" class="text-neutral-400 text-[15px]" />
                Pengaturan
              </NuxtLink>
            </div>

            <div class="border-t border-neutral-100 py-1">
              <button
                class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emergency-600 hover:bg-emergency-50 transition-colors"
                @click="logout()"
              >
                <Icon icon="lucide:log-out" class="text-[15px]" />
                Keluar
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
