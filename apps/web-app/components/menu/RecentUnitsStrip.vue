<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { emergencyLogoSrc, onEmergencyLogoError } from "~/utils/emergencyLogo";
import type { RecentUnit } from "~/utils/recentUnits";

const props = defineProps<{
  items: RecentUnit[];
}>();

const emit = defineEmits<{
  select: [unit: RecentUnit];
  clear: [];
}>();
</script>

<template>
  <div v-if="items.length" class="mb-3">
    <div class="flex items-center justify-between px-0.5 mb-1.5">
      <p class="m-0 text-[11px] font-semibold uppercase tracking-wide ui-text-secondary">
        Baru dihubungi
      </p>
      <button
        type="button"
        class="text-[11px] ui-text-secondary"
        @click="emit('clear')"
      >
        Hapus
      </button>
    </div>
    <div class="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-none">
      <button
        v-for="u in items"
        :key="u.id"
        type="button"
        class="ui-card shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 max-w-[200px] active:opacity-90"
        @click="emit('select', u)"
      >
        <div
          class="w-8 h-8 p-1 flex items-center justify-center shrink-0"
          style="background: var(--bb-bg-muted); border-radius: 0.65rem"
        >
          <SkeletonImage
            v-if="u.logo"
            :src="emergencyLogoSrc({ organization_logo: u.logo })"
            :alt="u.name"
            wrapper-class="w-full h-full"
            img-class="w-full h-full object-contain"
            @error="onEmergencyLogoError($event, { organization_logo: u.logo })"
          />
          <Icon
            v-else
            :icon="u.typeIcon || 'lucide:building-2'"
            class="text-base"
            style="color: var(--bb-text-secondary)"
          />
        </div>
        <div class="min-w-0 text-left">
          <p class="m-0 text-[12px] font-semibold ui-text-primary truncate">{{ u.name }}</p>
          <p class="m-0 text-[10px] ui-text-secondary truncate">
            {{ u.typeName || "Unit" }} · 1 ketuk
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  scrollbar-width: none;
}
</style>
