<script setup lang="ts">
/**
 * Floating pill nav for the public pages. Hides on scroll-down, returns on
 * scroll-up. Visibility is shared through `useState("lp-nav-visible")` so
 * sticky elements below it (e.g. the dashboard pills on /landing) can dock
 * underneath while it's shown.
 */
import { Icon } from "@iconify/vue";
import { DASHBOARD_URL } from "~/utils/landingContent";

const route = useRoute();

const links = [
  { label: "Fitur", to: "/landing#fitur" },
  { label: "Untuk unit", to: "/landing#dashboard" },
  { label: "Tentang", to: "/tentang" },
  { label: "Support", to: "/support" },
];

function isActive(to: string) {
  return !to.includes("#") && route.path === to;
}

const visible = useState("lp-nav-visible", () => true);
// Set by /landing while its dashboard section's sticky pill bar is docked
// under the nav — scrolling up there must not pop the nav back over it.
const suppressed = useState("lp-nav-suppressed", () => false);
const menuOpen = ref(false);
const scrolled = ref(false);

let lastY = 0;
let raf = 0;

function update() {
  const y = window.scrollY;
  const delta = y - lastY;
  scrolled.value = y > 8;
  if (menuOpen.value) visible.value = true;
  else if (suppressed.value) visible.value = false;
  else if (y < 120) visible.value = true;
  else if (delta > 4) visible.value = false;
  else if (delta < -4) visible.value = true;
  if (Math.abs(delta) > 4) lastY = y;
}

function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    update();
  });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") menuOpen.value = false;
}

watch(() => route.fullPath, () => (menuOpen.value = false));
// /landing computes this in its own scroll handler, which can run either
// before or after ours within the same frame — re-run update() once it
// settles so a stale read never survives past that frame.
watch(suppressed, () => update());

onMounted(() => {
  visible.value = true;
  lastY = window.scrollY;
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("keydown", onKey);
  if (raf) cancelAnimationFrame(raf);
});
</script>

<template>
  <header
    class="fixed inset-x-0 top-3 z-50 px-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:top-4 sm:px-4"
    :class="visible ? 'translate-y-0' : '-translate-y-[calc(100%+56px)]'"
  >
    <nav
      aria-label="Utama"
      class="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-3 rounded-full bg-white/85 pl-2 pr-2 backdrop-blur-xl transition-shadow duration-300"
      :class="
        scrolled || menuOpen
          ? 'shadow-[0_0_0_1px_rgba(28,25,23,0.07),0_12px_32px_-14px_rgba(28,25,23,0.22)]'
          : 'shadow-[0_0_0_1px_rgba(28,25,23,0.06)]'
      "
    >
      <NuxtLink to="/landing" class="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3" aria-label="ButuhBantuan — beranda">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--lp-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <Icon icon="mynaui:ambulance-solid" class="text-[17px] text-white" />
        </span>
        <span class="text-[15px] font-bold tracking-[-0.03em] max-[380px]:hidden">butuhbantuan</span>
      </NuxtLink>

      <ul class="hidden items-center gap-0.5 md:flex">
        <li v-for="l in links" :key="l.to">
          <NuxtLink
            :to="l.to"
            class="block rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors duration-200"
            :class="isActive(l.to) ? 'bg-[var(--lp-surface)] text-[var(--lp-ink)]' : 'text-[var(--lp-muted)] hover:text-[var(--lp-ink)]'"
            :aria-current="isActive(l.to) ? 'page' : undefined"
          >
            {{ l.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="flex items-center gap-1.5">
        <a
          :href="DASHBOARD_URL"
          class="hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-ink)] lg:block"
        >
          Masuk dashboard
        </a>
        <NuxtLink to="/" class="lp-btn lp-btn--ink lp-btn--sm">
          Buka aplikasi
        </NuxtLink>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-[var(--lp-ink)] transition-colors hover:bg-[var(--lp-surface)] md:hidden"
          :aria-expanded="menuOpen"
          aria-controls="lp-mobile-menu"
          :aria-label="menuOpen ? 'Tutup menu' : 'Buka menu'"
          @click="menuOpen = !menuOpen"
        >
          <Icon :icon="menuOpen ? 'lucide:x' : 'lucide:menu'" class="text-[20px]" />
        </button>
      </div>
    </nav>

    <Transition
      enter-active-class="transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      leave-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-[0.98]"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="menuOpen"
        id="lp-mobile-menu"
        class="mx-auto mt-2 max-w-[1080px] origin-top rounded-[24px] bg-white p-2 shadow-[0_0_0_1px_rgba(28,25,23,0.07),0_24px_48px_-20px_rgba(28,25,23,0.3)] md:hidden"
      >
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[16px] font-semibold tracking-[-0.01em] transition-colors hover:bg-[var(--lp-surface)]"
          :class="isActive(l.to) && 'bg-[var(--lp-surface)]'"
          :aria-current="isActive(l.to) ? 'page' : undefined"
        >
          {{ l.label }}
          <Icon icon="lucide:arrow-up-right" class="text-[16px] text-[var(--lp-faint)]" />
        </NuxtLink>
        <div class="mx-4 my-2 h-px bg-[var(--lp-line)]" />
        <a :href="DASHBOARD_URL" class="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[var(--lp-muted)]">
          Masuk dashboard unit
          <Icon icon="lucide:layout-dashboard" class="text-[16px]" />
        </a>
      </div>
    </Transition>
  </header>
</template>
