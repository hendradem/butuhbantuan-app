<script>
import theme from "#build/ui/prose/h1";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig, useRuntimeConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  id: { type: String, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const { headings } = useRuntimeConfig().public?.mdc || {};
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.h1 || {} })());
const generate = computed(() => props.id && typeof headings?.anchorLinks === "object" && headings.anchorLinks.h1);
</script>

<template>
  <h1 :id="id" :class="ui.base({ class: props.class })">
    <a v-if="id && generate" :href="`#${id}`" :class="ui.link({ class: props.ui?.link })">
      <slot />
    </a>
    <slot v-else />
  </h1>
</template>
