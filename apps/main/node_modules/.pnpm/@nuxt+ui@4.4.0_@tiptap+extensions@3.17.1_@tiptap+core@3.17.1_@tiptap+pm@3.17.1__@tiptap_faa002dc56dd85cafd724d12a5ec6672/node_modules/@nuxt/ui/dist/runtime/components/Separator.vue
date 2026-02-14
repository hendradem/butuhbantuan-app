<script>
import theme from "#build/ui/separator";
</script>

<script setup>
import { computed } from "vue";
import { Separator, useForwardProps } from "reka-ui";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { tv } from "../utils/tv";
import UIcon from "./Icon.vue";
import UAvatar from "./Avatar.vue";
const props = defineProps({
  as: { type: null, required: false },
  label: { type: String, required: false },
  icon: { type: null, required: false },
  avatar: { type: Object, required: false },
  color: { type: null, required: false },
  size: { type: null, required: false },
  type: { type: null, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  class: { type: null, required: false },
  ui: { type: null, required: false },
  decorative: { type: Boolean, required: false }
});
const slots = defineSlots();
const appConfig = useAppConfig();
const rootProps = useForwardProps(reactivePick(props, "as", "decorative", "orientation"));
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.separator || {} })({
  color: props.color,
  orientation: props.orientation,
  size: props.size,
  type: props.type
}));
</script>

<template>
  <Separator v-bind="rootProps" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <div data-slot="border" :class="ui.border({ class: props.ui?.border })" />

    <template v-if="label || icon || avatar || !!slots.default">
      <div data-slot="container" :class="ui.container({ class: props.ui?.container })">
        <slot :ui="ui">
          <span v-if="label" data-slot="label" :class="ui.label({ class: props.ui?.label })">{{ label }}</span>
          <UIcon v-else-if="icon" :name="icon" data-slot="icon" :class="ui.icon({ class: props.ui?.icon })" />
          <UAvatar v-else-if="avatar" :size="props.ui?.avatarSize || ui.avatarSize()" v-bind="avatar" data-slot="avatar" :class="ui.avatar({ class: props.ui?.avatar })" />
        </slot>
      </div>

      <div data-slot="border" :class="ui.border({ class: props.ui?.border })" />
    </template>
  </Separator>
</template>
