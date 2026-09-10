<script setup lang="ts">
/**
 * Full-screen intercept shown on pages that must NOT run inside the citizen
 * PWA (e.g. /dispatch/:token — used by field officers and community
 * volunteers). If the page is opened while the display mode is `standalone`,
 * we block the normal content and offer two escape hatches:
 *
 *   1. "Buka di browser" — `window.open(url, '_blank')` from inside a PWA
 *      launches the URL in the system browser (Chrome/Safari), not another
 *      PWA window. Requires a user gesture so pop-up blockers don't kill it.
 *   2. "Salin link" — falls back to clipboard for cases where step 1 is
 *      blocked (private mode, unusual browsers).
 *
 * The gate never renders when the app is being viewed in a normal browser
 * tab — dispatch pages work there as usual.
 */
import { Icon } from "@iconify/vue";

const url = ref("");
const copied = ref(false);

onMounted(() => {
  url.value = window.location.href;
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value);
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Legacy fallback — offscreen textarea + execCommand
    const ta = document.createElement("textarea");
    ta.value = url.value;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      copied.value = true;
      window.setTimeout(() => (copied.value = false), 2000);
    } catch { /* nothing to do */ }
    document.body.removeChild(ta);
  }
}

function openInBrowser() {
  window.open(url.value, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <div
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
    style="background: var(--bb-bg-page)"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
      style="background: rgba(239, 68, 68, 0.1); color: var(--bb-accent)"
    >
      <Icon icon="lucide:external-link" class="text-3xl" />
    </div>

    <h1 class="text-lg font-bold text-center ui-text-primary">
      Halaman khusus petugas
    </h1>
    <p class="mt-2 max-w-xs text-center text-sm ui-text-secondary leading-relaxed">
      Halaman ini tidak dibuka di aplikasi warga. Silakan lanjutkan di browser.
    </p>

    <div class="mt-6 w-full max-w-xs space-y-2">
      <button
        type="button"
        class="w-full rounded-xl py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        style="background: var(--bb-accent)"
        @click="openInBrowser"
      >
        Buka di browser
      </button>
      <button
        type="button"
        class="w-full rounded-xl border py-3 text-sm font-medium transition-opacity active:opacity-70"
        style="border-color: var(--bb-border); color: var(--bb-text)"
        @click="copyLink"
      >
        <span v-if="!copied" class="inline-flex items-center gap-1.5">
          <Icon icon="lucide:copy" class="text-base" />
          Salin link
        </span>
        <span v-else class="inline-flex items-center gap-1.5" style="color: #16a34a">
          <Icon icon="lucide:check" class="text-base" />
          Link disalin
        </span>
      </button>
    </div>

    <p class="mt-4 max-w-xs text-center text-[11px] ui-text-tertiary">
      Setelah menyalin, buka Chrome atau Safari dan tempel di address bar.
    </p>
  </div>
</template>
