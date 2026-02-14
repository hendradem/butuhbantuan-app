<script>
import theme from "#build/ui/prose/card";
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
  title: { type: String, required: false },
  description: { type: String, required: false },
  color: { type: null, required: false },
  class: { type: null, required: false },
  ui: { type: null, required: false }
});
const slots = defineSlots();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.prose?.card || {} })({
  color: props.color,
  to: !!props.to,
  title: !!props.title
}));
const target = computed(() => props.target || (!!props.to && typeof props.to === "string" && props.to.startsWith("http") ? "_blank" : void 0));
const ariaLabel = computed(() => (props.title || "Card link").trim());
</script>

<template>
  <div :class="ui.base({ class: props.class })">
    <ULink
      v-if="to"
      :aria-label="ariaLabel"
      v-bind="{ to, target, ...$attrs }"
      class="focus:outline-none"
      raw
    >
      <span class="absolute inset-0" aria-hidden="true" />
    </ULink>

    <UIcon v-if="icon" :name="icon" :class="ui.icon({ class: props.ui?.icon })" />
    <UIcon v-if="!!to && target === '_blank'" :name="appConfig.ui.icons.external" :class="ui.externalIcon({ class: props.ui?.externalIcon })" />

    <p v-if="title || !!slots.title" :class="ui.title({ class: props.ui?.title })">
      <slot name="title" mdc-unwrap="p">
        {{ title }}
      </slot>
    </p>

    <div v-if="!!slots.default" :class="ui.description({ class: props.ui?.description })">
      <slot>
        {{ description }}
      </slot>
    </div>
  </div>
</template>
