<script>
import theme from "#build/ui/prose/callout";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig } from "#imports";
import { tv } from "../../utils/tv";
import ULink from "../Link.vue";
import UIcon from "../Icon.vue";
defineOptions({ inheritAttrs: false });
const props = defineProps({
  to: { type: null, required: false },
  target: { type: [String, Object, null], required: false },
  icon: { type: null, required: false },
  color: { type: null, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.callout || {} })({
  color: props.color,
  to: !!props.to
}));
const target = computed(() => props.target || (!!props.to && typeof props.to === "string" && props.to.startsWith("http") ? "_blank" : void 0));
</script>

<template>
  <div :class="ui.base({ class: props.class })">
    <ULink
      v-if="to"
      v-bind="{ to, target, ...$attrs }"
      class="focus:outline-none"
      raw
    >
      <span class="absolute inset-0" aria-hidden="true" />
    </ULink>

    <UIcon v-if="icon" :name="icon" :class="ui.icon({ class: props.ui?.icon })" />
    <UIcon v-if="!!to && target === '_blank'" :name="appConfig.ui.icons.external" :class="ui.externalIcon({ class: props.ui?.externalIcon })" />

    <slot mdc-unwrap="p" />
  </div>
</template>
