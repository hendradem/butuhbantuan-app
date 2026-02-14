<script>
import theme from "#build/ui/prose/p";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  class: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.p || {} }));
</script>

<template>
  <p :class="ui({ class: props.class })">
    <slot />
  </p>
</template>
