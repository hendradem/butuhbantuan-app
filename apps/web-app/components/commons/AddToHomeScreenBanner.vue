<script setup lang="ts">
import { Icon } from "@iconify/vue";

const STORAGE_KEY = "pwa-install-dismissed";
const deferredPrompt = ref<any>(null);
const showBanner = ref(false);

// Keeps the ticket island below this banner while it is up.
const bannerEl = useTopInset("pwa-install");

onMounted(() => {
  if (localStorage.getItem(STORAGE_KEY) === "true") return;

  const handleBeforeInstall = (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showBanner.value = true;
  };
  const handleInstalled = () => hidePermanently();
  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("appinstalled", handleInstalled);
  onUnmounted(() => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    window.removeEventListener("appinstalled", handleInstalled);
  });
});

function hidePermanently() {
  localStorage.setItem(STORAGE_KEY, "true");
  deferredPrompt.value = null;
  showBanner.value = false;
}

async function handleInstall() {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    await deferredPrompt.value.userChoice;
  }
  hidePermanently();
}
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="showBanner"
      ref="bannerEl"
      class="fixed top-0 left-0 right-0 max-w-md mx-auto z-50 w-full h-[60px] flex items-center justify-center px-3 text-white"
      style="background: var(--bb-accent); box-shadow: var(--bb-shadow-soft)"
    >
      <div class="w-full flex justify-between items-center">
        <div class="flex gap-3 items-center">
          <div>
            <p class="m-0 leading-none text-[15px]">Install Butuhbantuan</p>
            <p class="text-xs m-0 leading-tight font-normal" style="color: rgba(255,255,255,0.75)">
              Sekali klik, penggunaan lebih mudah.
            </p>
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <button
            type="button"
            class="flex items-center justify-center px-4 py-1 gap-2 text-sm"
            style="background: var(--bb-bg-surface); color: var(--bb-accent); border-radius: var(--bb-radius-control)"
            @click="handleInstall"
          >
            <Icon icon="solar:download-square-outline" class="w-4 h-4" />
            Install
          </button>
          <button
            class="w-9 h-9 hover:bg-white/20 cursor-pointer rounded-full flex items-center justify-center"
            @click="hidePermanently"
          >
            <Icon icon="ph:x" class="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.5s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-60px); opacity: 0; }
</style>
