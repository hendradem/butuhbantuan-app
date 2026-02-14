<script>
import theme from "#build/ui/prose/a";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
import ULink from "../Link.vue";
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.a || {} }));
const props = defineProps({
  href: { type: String, required: false },
  target: { type: null, required: false },
  class: { type: null, required: false }
});
defineSlots();
</script>

<template>
  <ULink :href="href" :target="target" :class="ui({ class: props.class })" raw>
    <slot />
  </ULink>
</template>
