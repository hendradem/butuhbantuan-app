<script setup lang="ts">
const { collapsed, toggle } = useSidebar();
const mobileOpen = ref(false);

function closeMobile() { mobileOpen.value = false; }

// provide for header toggle button
provide("toggleMobile", () => { mobileOpen.value = !mobileOpen.value; });
</script>

<template>
  <div class="flex h-screen bg-neutral-50 overflow-hidden font-sans">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-40 bg-neutral-950/40 lg:hidden"
        @click="closeMobile"
      />
    </Transition>

    <!-- Sidebar — always visible on lg+, drawer on mobile -->
    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:flex transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
    >
      <AppSidebar :mobile-open="mobileOpen" @close="closeMobile" />
    </div>

    <!-- Main content -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <AppHeader @toggle-mobile="mobileOpen = !mobileOpen" />
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
