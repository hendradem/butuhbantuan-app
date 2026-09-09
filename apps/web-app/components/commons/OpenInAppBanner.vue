<script setup lang="ts">
/**
 * Shown at the top of deep-link pages (ticket / dispatch / track) when the user
 * lands in a browser view but has the PWA installed. Chrome's link-handler
 * consent flow may skip the PWA on the first tap; this banner nudges them to
 * open in the installed app for a better experience.
 *
 * Detection strategy:
 *   1. Skip if already inside the PWA (display-mode: standalone).
 *   2. Ask Chrome via `navigator.getInstalledRelatedApps()` — the only reliable
 *      cross-tab signal that the PWA is installed. Not supported on iOS
 *      Safari; banner simply stays hidden there (iOS has its own share sheet).
 *
 * Once dismissed, we suppress the banner for the rest of the session.
 */
import { Icon } from "@iconify/vue";

const DISMISS_KEY = "bb-open-in-app-dismissed";
const show = ref(false);

async function detectInstalledPwa(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; id?: string; url?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps !== "function") return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari legacy
  if ((window.navigator as unknown as { standalone?: boolean }).standalone) return true;
  return false;
}

onMounted(async () => {
  if (isStandalone()) return;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
  if (await detectInstalledPwa()) show.value = true;
});

function dismiss() {
  show.value = false;
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch { /* private mode */ }
}
</script>

<template>
  <Transition name="slide-down">
    <aside
      v-if="show"
      class="fixed top-0 left-0 right-0 max-w-md mx-auto z-40 flex items-center gap-3 px-4 py-3"
      style="background: var(--bb-bg-surface); border-bottom: 1px solid var(--bb-border); box-shadow: var(--bb-shadow-soft)"
      role="status"
      aria-live="polite"
    >
      <div class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style="background: var(--bb-accent-soft, rgba(239, 68, 68, 0.1))">
        <Icon icon="lucide:smartphone" class="text-lg" style="color: var(--bb-accent)" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold leading-tight ui-text-primary">
          Buka di aplikasi Butuhbantuan
        </p>
        <p class="text-xs ui-text-secondary leading-tight mt-0.5">
          Ketuk ikon Butuhbantuan di homescreen untuk pengalaman penuh.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center active:bg-neutral-200"
        aria-label="Tutup"
        @click="dismiss"
      >
        <Icon icon="ph:x" class="text-base" style="color: var(--bb-text-secondary)" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
