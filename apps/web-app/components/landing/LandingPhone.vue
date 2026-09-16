<script setup lang="ts">
/**
 * The device frame used by both the hero and the citizen walkthrough, so the
 * phone chrome is defined once. Drop a `LandingPhoneScreens` (or any screen)
 * into the slot; wrap it in `.phone-scale` where the frame has to shrink to
 * fit a short viewport.
 */
</script>

<template>
  <div class="relative">
    <!-- Side buttons, so the frame reads as hardware rather than a rounded box. -->
    <span aria-hidden="true" class="absolute -left-[3px] top-[112px] h-[34px] w-[3px] rounded-l-full bg-[#2a2624]" />
    <span aria-hidden="true" class="absolute -left-[3px] top-[156px] h-[52px] w-[3px] rounded-l-full bg-[#2a2624]" />
    <span aria-hidden="true" class="absolute -right-[3px] top-[146px] h-[72px] w-[3px] rounded-r-full bg-[#2a2624]" />

    <div class="relative rounded-[50px] bg-[#151312] p-[3px] shadow-[0_50px_90px_-38px_rgba(28,25,23,0.55),inset_0_0_0_1px_rgba(255,255,255,0.09)]">
      <div class="rounded-[47px] bg-[#0c0b0a] p-[7px]">
        <div class="relative h-[560px] w-[268px] overflow-hidden rounded-[40px] bg-white">
          <!-- Dynamic island, sitting over the screen the way it does on device. -->
          <div class="absolute left-1/2 top-[9px] z-30 h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-[#0c0b0a]" />
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>
