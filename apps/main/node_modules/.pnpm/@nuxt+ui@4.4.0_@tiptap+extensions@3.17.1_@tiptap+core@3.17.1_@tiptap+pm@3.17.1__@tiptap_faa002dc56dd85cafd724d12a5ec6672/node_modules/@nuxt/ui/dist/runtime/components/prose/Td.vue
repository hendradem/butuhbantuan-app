<script>
import theme from "#build/ui/prose/td";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
const props = defineProps({
  align: { type: String, required: false },
  class: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.td || {} }));
</script>

<template>
  <td :class="ui({ align: props.align, class: props.class })">
    <slot />
  </td>
</template>
