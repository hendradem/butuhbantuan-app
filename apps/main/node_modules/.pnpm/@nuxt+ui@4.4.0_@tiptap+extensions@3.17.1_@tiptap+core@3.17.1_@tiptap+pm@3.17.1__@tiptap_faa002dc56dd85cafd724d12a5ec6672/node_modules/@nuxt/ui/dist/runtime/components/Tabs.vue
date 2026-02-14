<script>
import theme from "#build/ui/tabs";
</script>

<script setup>
import { ref, computed } from "vue";
import { TabsRoot, TabsList, TabsIndicator, TabsTrigger, TabsContent, useForwardPropsEmits } from "reka-ui";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { get } from "../utils";
import { tv } from "../utils/tv";
import UIcon from "./Icon.vue";
import UAvatar from "./Avatar.vue";
import UBadge from "./Badge.vue";
const props = defineProps({
  as: { type: null, required: false },
  items: { type: Array, required: false },
  color: { type: null, required: false },
  variant: { type: null, required: false },
  size: { type: null, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  content: { type: Boolean, required: false, default: true },
  valueKey: { type: null, required: false, default: "value" },
  labelKey: { type: null, required: false, default: "label" },
  class: { type: null, required: false },
  ui: { type: null, required: false },
  defaultValue: { type: [String, Number], required: false, default: "0" },
  modelValue: { type: [String, Number], required: false },
  activationMode: { type: String, required: false },
  unmountOnHide: { type: Boolean, required: false, default: true }
});
const emits = defineEmits(["update:modelValue"]);
const slots = defineSlots();
const appConfig = useAppConfig();
const rootProps = useForwardPropsEmits(reactivePick(props, "as", "unmountOnHide"), emits);
const ui = computed(() => tv({ extend: tv(theme), ...appConfig.ui?.tabs || {} })({
  color: props.color,
  variant: props.variant,
  size: props.size,
  orientation: props.orientation
}));
const triggersRef = ref([]);
defineExpose({
  triggersRef
});
</script>

<template>
  <TabsRoot
    v-bind="rootProps"
    :model-value="modelValue"
    :default-value="defaultValue"
    :orientation="orientation"
    :activation-mode="activationMode"
    data-slot="root"
    :class="ui.root({ class: [props.ui?.root, props.class] })"
  >
    <TabsList data-slot="list" :class="ui.list({ class: props.ui?.list })">
      <TabsIndicator data-slot="indicator" :class="ui.indicator({ class: props.ui?.indicator })" />

      <slot name="list-leading" />

      <TabsTrigger
        v-for="(item, index) of items"
        :key="index"
        :ref="(el) => triggersRef[index] = el"
        :value="get(item, props.valueKey) ?? String(index)"
        :disabled="item.disabled"
        data-slot="trigger"
        :class="ui.trigger({ class: [props.ui?.trigger, item.ui?.trigger] })"
      >
        <slot name="leading" :item="item" :index="index" :ui="ui">
          <UIcon v-if="item.icon" :name="item.icon" data-slot="leadingIcon" :class="ui.leadingIcon({ class: [props.ui?.leadingIcon, item.ui?.leadingIcon] })" />
          <UAvatar v-else-if="item.avatar" :size="item.ui?.leadingAvatarSize || props.ui?.leadingAvatarSize || ui.leadingAvatarSize()" v-bind="item.avatar" data-slot="leadingAvatar" :class="ui.leadingAvatar({ class: [props.ui?.leadingAvatar, item.ui?.leadingAvatar] })" />
        </slot>

        <span v-if="get(item, props.labelKey) || !!slots.default" data-slot="label" :class="ui.label({ class: [props.ui?.label, item.ui?.label] })">
          <slot :item="item" :index="index">{{ get(item, props.labelKey) }}</slot>
        </span>

        <slot name="trailing" :item="item" :index="index" :ui="ui">
          <UBadge
            v-if="item.badge || item.badge === 0"
            color="neutral"
            variant="outline"
            :size="item.ui?.trailingBadgeSize || props.ui?.trailingBadgeSize || ui.trailingBadgeSize()"
            v-bind="typeof item.badge === 'string' || typeof item.badge === 'number' ? { label: item.badge } : item.badge"
            data-slot="trailingBadge"
            :class="ui.trailingBadge({ class: [props.ui?.trailingBadge, item.ui?.trailingBadge] })"
          />
        </slot>
      </TabsTrigger>

      <slot name="list-trailing" />
    </TabsList>

    <template v-if="!!content">
      <TabsContent v-for="(item, index) of items" :key="index" :value="get(item, props.valueKey) ?? String(index)" data-slot="content" :class="ui.content({ class: [props.ui?.content, item.ui?.content, item.class] })">
        <slot :name="item.slot || 'content'" :item="item" :index="index" :ui="ui">
          {{ item.content }}
        </slot>
      </TabsContent>
    </template>
  </TabsRoot>
</template>
