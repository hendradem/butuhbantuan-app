<script setup lang="ts">
/**
 * Deep-link entry-point banner (ticket / dispatch / track pages).
 *
 * Shown when:
 *   - Current view is a browser tab (NOT PWA standalone), AND
 *   - The Butuhbantuan PWA is installed on this device.
 *
 * Detection: `navigator.getInstalledRelatedApps()` (Chrome/Edge Android).
 * On iOS/Safari the API doesn't exist → banner stays hidden.
 *
 * The banner does NOT try to force-launch the PWA (Chrome/Android does not
 * expose an API to do so from web content; that path always requires user
 * consent). Instead it teaches the user: tap the app icon on their home
 * screen. Once they enable "Supported links" for the PWA in Android Chrome
 * settings, future taps will auto-route to the PWA.
 */
import { Icon } from "@iconify/vue";

const DISMISS_KEY = "bb-open-in-app-dismissed";
const show = ref(false);

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((window.navigator as unknown as { standalone?: boolean }).standalone) return true;
  return false;
}

async function pwaIsInstalled(): Promise<boolean> {
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps !== "function") return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

const PENDING_KEY = "bb-pending-deep-link";

function recordPendingDeepLink() {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        url: window.location.pathname + window.location.search,
        ts: Date.now(),
      }),
    );
  } catch { /* private mode / quota */ }
}

onMounted(async () => {
  if (isStandalone()) return;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
  if (await pwaIsInstalled()) {
    show.value = true;
    // Bridge: if the user opens the PWA from their home screen next, the
    // pwa-deep-link plugin picks this up and navigates the PWA to the URL
    // they were viewing here. Removes the "PWA opens on blank home page" trap.
    recordPendingDeepLink();
  }
});

function dismiss() {
  show.value = false;
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch { /* private mode */ }
}
</script>

<template>
  <Transition name="bb-oiab">
    <aside
      v-if="show"
      role="status"
      aria-live="polite"
      class="fixed inset-x-0 top-0 z-40 mx-auto flex max-w-md items-center gap-3 px-4 py-3"
      style="background: var(--bb-bg-surface); border-bottom: 1px solid var(--bb-border); box-shadow: var(--bb-shadow-soft)"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style="background: rgba(239, 68, 68, 0.1); color: var(--bb-accent)"
      >
        <Icon icon="lucide:smartphone-nfc" class="text-lg" />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-[13px] font-semibold leading-tight ui-text-primary">
          Buka di aplikasi Butuhbantuan
        </p>
        <p class="mt-0.5 text-[11px] leading-snug ui-text-secondary">
          Ketuk ikon aplikasi di homescreen untuk pengalaman terbaik.
        </p>
      </div>

      <button
        type="button"
        class="shrink-0 rounded-full p-2 transition-opacity hover:opacity-70 active:opacity-50"
        aria-label="Tutup"
        @click="dismiss"
      >
        <Icon icon="ph:x" class="text-base" style="color: var(--bb-text-secondary)" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.bb-oiab-enter-active,
.bb-oiab-leave-active {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1),
              opacity 0.25s ease;
}
.bb-oiab-enter-from,
.bb-oiab-leave-to {
  transform: translateY(-110%);
  opacity: 0;
}
</style>
