<script setup lang="ts">
/**
 * Frame shared by the public pages (/landing, /tentang, /support): fonts,
 * the `.lp` design scope, floating nav, footer, and scroll-reveal.
 *
 * Mark an element `data-reveal` to have it rise into place (optionally with
 * `style="--d: 120ms"`, or `data-reveal="card"` for a heavier lift), or
 * `data-stagger` to cascade its direct children in one after another.
 */
import "~/assets/css/landing.css";

useHead({
  link: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap",
    },
  ],
});

const rootEl = ref<HTMLElement | null>(null);
const revealReady = ref(false);
let io: IntersectionObserver | null = null;

onMounted(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window) || !rootEl.value) return;

  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        io?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  rootEl.value
    .querySelectorAll("[data-reveal], [data-stagger]")
    .forEach((el) => io!.observe(el));
  revealReady.value = true;
});

onBeforeUnmount(() => {
  io?.disconnect();
  io = null;
});
</script>

<template>
  <div ref="rootEl" class="lp" :class="revealReady && 'lp--ready'">
    <a href="#main" class="lp-skip">Langsung ke konten</a>
    <LandingNav />
    <main id="main">
      <slot />
    </main>
    <LandingFooter />
  </div>
</template>
