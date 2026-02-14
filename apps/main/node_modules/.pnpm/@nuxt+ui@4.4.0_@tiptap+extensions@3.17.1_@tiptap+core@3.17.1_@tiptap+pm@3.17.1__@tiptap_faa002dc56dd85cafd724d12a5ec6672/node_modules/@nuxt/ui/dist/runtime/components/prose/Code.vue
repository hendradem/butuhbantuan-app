<script>
import theme from "#build/ui/prose/code";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  lang: { type: String, required: false },
  color: { type: null, required: false },
  class: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.code || {} }));
</script>

<template>
  <code :class="ui({ class: (props.class || '').split(',').join(' '), color: props.color })">
    <slot />
  </code>
</template>
