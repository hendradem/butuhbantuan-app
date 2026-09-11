<script setup lang="ts">
/**
 * Dedicated sponsor space. Two layouts:
 *   • strip — one quiet row of monochrome logos (menu footers, end of lists)
 *   • grid  — larger tiles; "utama" sponsors span the full row (support page)
 * With no sponsors configured it shows placeholder slots + a CTA.
 */
import { Icon } from "@iconify/vue";
import { SPONSORS, SPONSOR_INFO_PATH, SPONSOR_PLACEHOLDER_SLOTS } from "~/utils/sponsors";

withDefaults(defineProps<{ variant?: "strip" | "grid"; title?: string }>(), {
  variant: "strip",
  title: "Didukung oleh",
});

const sorted = computed(() =>
  [...SPONSORS].sort((a, b) => Number(b.tier === "utama") - Number(a.tier === "utama")),
);
const isEmpty = computed(() => sorted.value.length === 0);
</script>

<template>
  <section class="sponsor" :class="`sponsor--${variant}`" :aria-label="title">
    <div class="flex items-center justify-between gap-3">
      <p class="sponsor-title">{{ title }}</p>
      <NuxtLink :to="SPONSOR_INFO_PATH" class="sponsor-cta">
        Jadi sponsor
        <Icon icon="lucide:arrow-right" class="text-[12px]" />
      </NuxtLink>
    </div>

    <ul class="sponsor-list">
      <template v-if="isEmpty">
        <li
          v-for="i in SPONSOR_PLACEHOLDER_SLOTS"
          :key="i"
          class="sponsor-slot sponsor-slot--empty"
          :class="variant === 'grid' && i === 1 && 'sponsor-slot--featured'"
        >
          <Icon icon="lucide:image-plus" class="text-[14px]" />
          <span>{{ variant === "grid" && i === 1 ? "Sponsor utama" : "Logo sponsor" }}</span>
        </li>
      </template>
      <template v-else>
        <li
          v-for="s in sorted"
          :key="s.name"
          class="sponsor-slot"
          :class="variant === 'grid' && s.tier === 'utama' && 'sponsor-slot--featured'"
        >
          <component
            :is="s.href ? 'a' : 'span'"
            :href="s.href"
            :target="s.href ? '_blank' : undefined"
            :rel="s.href ? 'noopener noreferrer sponsored' : undefined"
            class="flex h-full w-full items-center justify-center"
          >
            <img :src="s.logo" :alt="s.name" class="sponsor-logo" loading="lazy" decoding="async" />
          </component>
        </li>
      </template>
    </ul>
  </section>
</template>

<style scoped>
.sponsor-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--bb-text-tertiary);
}
.sponsor-cta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--bb-text-secondary);
}

.sponsor-list {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.sponsor--strip .sponsor-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.sponsor--grid .sponsor-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sponsor-slot {
  display: flex;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--bb-radius-control);
  background: var(--bb-bg-muted);
}
.sponsor--grid .sponsor-slot {
  height: 72px;
}
.sponsor-slot--featured {
  grid-column: 1 / -1;
  height: 88px;
}
.sponsor-slot--empty {
  gap: 6px;
  background: transparent;
  border: 1.5px dashed var(--bb-border-strong);
  font-size: 11px;
  font-weight: 500;
  color: var(--bb-text-tertiary);
}

/* Monochrome by default so logos stay calm next to emergency UI. */
.sponsor-logo {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.72;
  transition:
    filter 0.2s ease,
    opacity 0.2s ease;
}
.sponsor-slot:hover .sponsor-logo {
  filter: none;
  opacity: 1;
}
</style>
