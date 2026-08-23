<script setup lang="ts">
/**
 * Image with pulse skeleton until load succeeds.
 * Parent can swap src on @error (e.g. logo fallback) — skeleton stays until the new src loads.
 */
const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    imgClass?: string;
    /** Extra classes on the wrapper (size, rounded, bg). */
    wrapperClass?: string;
  }>(),
  {
    alt: "",
    imgClass: "w-full h-full object-contain",
    wrapperClass: "",
  },
);

const emit = defineEmits<{
  error: [event: Event];
  load: [];
}>();

const loaded = ref(false);

watch(
  () => props.src,
  () => {
    loaded.value = false;
  },
);

function onLoad() {
  loaded.value = true;
  emit("load");
}

function onError(event: Event) {
  loaded.value = false;
  emit("error", event);
}
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="wrapperClass"
  >
    <div
      v-show="!loaded"
      class="absolute inset-0 animate-pulse bg-neutral-200"
      aria-hidden="true"
    />
    <img
      :src="src"
      :alt="alt"
      :class="[
        imgClass,
        'transition-opacity duration-200',
        loaded ? 'opacity-100' : 'opacity-0',
      ]"
      @load="onLoad"
      @error="onError"
    >
  </div>
</template>
