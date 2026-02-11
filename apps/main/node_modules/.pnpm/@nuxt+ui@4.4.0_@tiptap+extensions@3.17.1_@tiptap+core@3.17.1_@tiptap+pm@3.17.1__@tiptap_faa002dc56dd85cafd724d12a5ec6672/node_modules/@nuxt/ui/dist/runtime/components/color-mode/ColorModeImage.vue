<script>

</script>

<script setup>
import ImageComponent from "#build/ui-image-component";
defineOptions({ inheritAttrs: false });
defineProps({
  dark: { type: String, required: true },
  light: { type: String, required: true }
});
</script>

<template>
  <component :is="ImageComponent" :src="light" class="dark:hidden" v-bind="$attrs" />
  <component :is="ImageComponent" :src="dark" class="hidden dark:block" v-bind="$attrs" />
</template>
