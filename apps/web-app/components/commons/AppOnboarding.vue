<script setup lang="ts">
import { useSwipe } from "@vueuse/core";

const onboardingStore = useOnboardingStore();

const steps = [
  {
    title: "Cari Bantuan Darurat",
    description: "Cari bantuan untuk keadaan darurat dengan cepat dan mudah dengan Butuhbantuan",
    image: "/assets/illustration/help.svg",
  },
  {
    title: "Temukan berbagai jenis bantuan",
    description: "Temukan Ambulans, Pemadam Kebakaran, Tim SAR dan yang lainnya dengan cepat dan mudah",
    image: "/assets/illustration/chat.svg",
  },
  {
    title: "Lokasi Otomatis Terdeteksi",
    description: "Cukup mudah, Aplikasi akan mendeteksi lokasimu dan mencarikan bantuan untuk kamu.",
    image: "/assets/illustration/location.svg",
  },
];

const stepIndex = ref(0);
const isLast = computed(() => stepIndex.value === steps.length - 1);
const current = computed(() => steps[stepIndex.value]);

const container = ref<HTMLElement | null>(null);
const { direction } = useSwipe(container, {
  onSwipeEnd() {
    if (direction.value === "left") nextStep();
    else if (direction.value === "right") prevStep();
  },
});

function goToStep(i: number) { stepIndex.value = i; }
function nextStep() { isLast.value ? finish() : stepIndex.value++; }
function prevStep() { if (stepIndex.value > 0) stepIndex.value--; }
function finish() {
  localStorage.setItem("onboarding", "false");
  onboardingStore.setIsOnboarding(false);
}
</script>

<template>
  <div
    ref="container"
    class="ui-page min-h-screen flex flex-col p-6 text-center justify-end select-none"
  >
    <div class="flex h-[400px] items-center justify-center">
      <div class="flex flex-col items-center">
        <Transition name="fade" mode="out-in">
          <div :key="stepIndex" class="w-full h-[200px] mb-6">
            <SkeletonImage
              :src="current.image"
              :alt="current.title"
              wrapper-class="h-full w-full"
              img-class="h-full w-full object-contain"
            />
          </div>
        </Transition>
        <Transition name="fade" mode="out-in">
          <div :key="stepIndex">
            <h2 class="text-lg font-semibold mb-2 ui-text-primary">{{ current.title }}</h2>
            <p class="text-sm max-w-sm ui-text-secondary">{{ current.description }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <div class="w-full flex flex-col items-center space-y-4">
      <div class="flex gap-2 mb-8">
        <button
          v-for="(_, i) in steps"
          :key="i"
          type="button"
          :class="['w-2.5 h-2.5 rounded-full transition-colors duration-300', i === stepIndex ? 'scale-110' : '']"
          :style="
            i === stepIndex
              ? { background: 'var(--bb-accent)' }
              : { background: 'var(--bb-text-tertiary)' }
          "
          @click="goToStep(i)"
        />
      </div>
      <button type="button" class="ui-btn-primary" @click="nextStep">
        {{ isLast ? "Mulai" : "Lanjut" }}
      </button>
      <button type="button" class="text-sm ui-text-secondary" @click="finish">Lewati</button>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s, transform 0.4s; }
.fade-enter-from { opacity: 0; transform: translateY(10px); }
.fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
