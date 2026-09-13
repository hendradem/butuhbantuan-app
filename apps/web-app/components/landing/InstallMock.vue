<script setup lang="ts">
/**
 * Illustrations for the "add to home screen" steps on /landing, one per step:
 *   0 — the site open in a mobile browser
 *   1 — the browser menu, with "Tambahkan ke layar utama" highlighted
 *   2 — the installed icon landing on the home screen
 * Stylised UI, not a real screenshot. Motion is decorative and stops under
 * prefers-reduced-motion (handled globally in landing.css).
 */
import { Icon } from "@iconify/vue";

defineProps<{ variant: number }>();

const menuRows = [
  { icon: "lucide:bookmark", label: "Tambahkan ke bookmark" },
  { icon: "lucide:smartphone", label: "Tambahkan ke layar utama", active: true },
  { icon: "lucide:share-2", label: "Bagikan halaman" },
];
</script>

<template>
  <div class="im-stage" aria-hidden="true">
    <!-- 0 — Site open in a browser -->
    <div v-if="variant === 0" class="im-phone im-float">
      <div class="im-omnibox">
        <Icon icon="lucide:lock" class="text-[9px] text-[var(--lp-faint)]" />
        <span class="im-url">butuhbantuan.space</span>
        <span class="im-caret" />
      </div>
      <div class="im-screen">
        <div class="im-map">
          <span class="im-road im-road--a" />
          <span class="im-road im-road--b" />
          <span class="im-block im-block--a" />
          <span class="im-block im-block--b" />
          <span class="im-pulse" />
          <span class="im-dot" />
          <span class="im-pin im-pin--red"><Icon icon="mynaui:ambulance-solid" class="text-[10px]" /></span>
          <span class="im-pin im-pin--amber"><Icon icon="lucide:flame" class="text-[9px]" /></span>
        </div>
        <div class="im-sheet">
          <span class="im-sheet-grip" />
          <div class="im-sheet-row">
            <span class="im-sheet-title">PSC 119 Sleman</span>
            <span class="im-chip">3 mnt</span>
          </div>
          <span class="im-sheet-cta">Minta bantuan</span>
        </div>
      </div>
    </div>

    <!-- 1 — Browser menu open -->
    <div v-else-if="variant === 1" class="im-phone">
      <div class="im-omnibox">
        <Icon icon="lucide:lock" class="text-[9px] text-[var(--lp-faint)]" />
        <span class="im-url">butuhbantuan.space</span>
        <span class="im-kebab im-kebab--tapped">
          <i /><i /><i />
          <span class="im-tap" />
        </span>
      </div>
      <div class="im-screen">
        <div class="im-map">
          <span class="im-road im-road--a" />
          <span class="im-road im-road--b" />
          <span class="im-block im-block--a" />
          <span class="im-block im-block--b" />
          <span class="im-dot" />
        </div>
        <div class="im-scrim" />
        <ul class="im-menu">
          <li v-for="r in menuRows" :key="r.label" class="im-menu-row" :class="r.active && 'im-menu-row--active'">
            <Icon :icon="r.icon" class="text-[11px]" />
            <span>{{ r.label }}</span>
            <span v-if="r.active" class="im-menu-cursor">
              <Icon icon="lucide:mouse-pointer-2" class="text-[11px]" />
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- 2 — Icon on the home screen -->
    <div v-else class="im-phone">
      <div class="im-home">
        <span class="im-home-time">09:41</span>
        <div class="im-grid">
          <span v-for="n in 5" :key="n" class="im-cell"><span class="im-app" /></span>
          <span class="im-cell">
            <span class="im-app im-app--brand im-pop">
              <Icon icon="mynaui:ambulance-solid" class="text-[16px] text-white" />
            </span>
            <span class="im-label">ButuhBantuan</span>
          </span>
          <span v-for="n in 2" :key="`b${n}`" class="im-cell"><span class="im-app" /></span>
        </div>
        <div class="im-dock">
          <span v-for="n in 4" :key="`d${n}`" class="im-dock-app" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.im-stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 206px;
  overflow: hidden;
  border-radius: 18px;
  background:
    radial-gradient(ellipse 70% 60% at 50% 115%, rgba(255, 255, 255, 0.9), transparent 70%),
    var(--tone-soft);
}

/* ── Phone shell ───────────────────────────────────────────────────────── */
.im-phone {
  position: relative;
  width: 172px;
  height: 178px;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  background: #fff;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.07),
    0 18px 36px -18px rgba(28, 25, 23, 0.45);
}
.im-float {
  animation: im-float 5s ease-in-out infinite;
}
@keyframes im-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* ── Browser chrome ────────────────────────────────────────────────────── */
.im-omnibox {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding-inline: 9px;
  border-bottom: 1px solid var(--lp-line);
  background: #fafaf9;
}
.im-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  /* Whole pixels only: at fractional sizes the hinting collapses letters
     like "n" into a bar at this scale. */
  font-size: 9px;
  font-weight: 500;
  color: var(--lp-muted);
}
.im-caret {
  width: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--lp-line);
}
.im-kebab {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5px;
  padding: 2px;
}
.im-kebab i {
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: var(--lp-ink);
}
.im-tap {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1.5px solid var(--tone);
  opacity: 0;
  animation: im-tap 2.6s ease-out infinite;
}
@keyframes im-tap {
  0% {
    opacity: 0.9;
    transform: scale(0.6);
  }
  60%,
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

/* ── Screen 0: map preview ─────────────────────────────────────────────── */
.im-screen {
  position: relative;
  height: calc(100% - 26px);
}
.im-map {
  position: absolute;
  inset: 0;
  background: #eef0ea;
}
.im-road {
  position: absolute;
  background: #fff;
}
.im-road--a {
  left: -10%;
  top: 38%;
  width: 120%;
  height: 7px;
  transform: rotate(-6deg);
}
.im-road--b {
  left: 44%;
  top: -10%;
  width: 5px;
  height: 120%;
}
.im-block {
  position: absolute;
  border-radius: 3px;
  background: #e2e6dc;
}
.im-block--a {
  left: 10%;
  top: 10%;
  width: 26px;
  height: 18px;
}
.im-block--b {
  right: 12%;
  top: 52%;
  width: 22px;
  height: 22px;
}
.im-pulse,
.im-dot {
  position: absolute;
  left: 30%;
  top: 46%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.im-pulse {
  width: 34px;
  height: 34px;
  background: rgba(2, 132, 199, 0.18);
  animation: im-pulse 2.4s ease-out infinite;
}
@keyframes im-pulse {
  0% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.55);
  }
  70%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.25);
  }
}
.im-dot {
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  background: var(--lp-sky);
  box-shadow: 0 2px 5px rgba(28, 25, 23, 0.25);
}
.im-pin {
  position: absolute;
  display: flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 3px 8px -2px rgba(28, 25, 23, 0.35);
}
.im-pin--red {
  left: 58%;
  top: 20%;
  color: var(--lp-accent);
}
.im-pin--amber {
  left: 18%;
  top: 68%;
  color: var(--lp-amber);
}
.im-sheet {
  position: absolute;
  inset-inline: 7px;
  bottom: 0;
  padding: 7px 9px 10px;
  border-radius: 12px 12px 0 0;
  background: #fff;
  box-shadow: 0 -6px 18px -8px rgba(28, 25, 23, 0.3);
}
.im-sheet-grip {
  display: block;
  width: 22px;
  height: 2.5px;
  margin: 0 auto 7px;
  border-radius: 2px;
  background: var(--lp-line);
}
.im-sheet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.im-sheet-title {
  font-size: 9px;
  font-weight: 700;
  color: var(--lp-ink);
}
.im-chip {
  padding: 1.5px 5px;
  border-radius: 999px;
  background: var(--lp-green-soft);
  font-size: 8px;
  font-weight: 700;
  color: #047857;
}
.im-sheet-cta {
  display: flex;
  height: 18px;
  margin-top: 7px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--lp-accent);
  font-size: 8px;
  font-weight: 700;
  color: #fff;
}

/* ── Screen 1: browser menu ────────────────────────────────────────────── */
.im-scrim {
  position: absolute;
  inset: 0;
  background: rgba(28, 25, 23, 0.18);
}
.im-menu {
  position: absolute;
  inset-inline: 8px;
  top: 8px;
  margin: 0;
  padding: 5px;
  list-style: none;
  border-radius: 10px;
  background: #fff;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.06),
    0 16px 28px -14px rgba(28, 25, 23, 0.45);
  animation: im-menu-in 0.5s var(--lp-ease) both;
}
@keyframes im-menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
  }
}
.im-menu-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px;
  border-radius: 7px;
  font-size: 8px;
  font-weight: 500;
  color: var(--lp-muted);
}
.im-menu-row--active {
  background: var(--tone-soft);
  font-weight: 700;
  color: var(--lp-ink);
}
.im-menu-row--active :deep(svg) {
  color: var(--tone);
}
.im-menu-cursor {
  position: absolute;
  right: 4px;
  bottom: -5px;
  color: var(--lp-ink);
  animation: im-nudge 2.6s ease-in-out infinite;
}
@keyframes im-nudge {
  0%,
  70%,
  100% {
    transform: translate(0, 0);
  }
  80%,
  90% {
    transform: translate(-2px, -2px);
  }
}

/* ── Screen 2: home screen ─────────────────────────────────────────────── */
.im-home {
  position: relative;
  height: 100%;
  padding: 10px 12px 0;
  background: linear-gradient(170deg, #f5f5f4, #e7e5e4);
}
.im-home-time {
  display: block;
  text-align: center;
  font-size: 8px;
  font-weight: 700;
  color: var(--lp-ink-2);
}
.im-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.im-cell {
  position: relative;
  display: block;
}
.im-app {
  display: block;
  aspect-ratio: 1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.75);
}
.im-app--brand {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lp-accent);
  box-shadow: 0 6px 14px -4px rgba(220, 38, 38, 0.65);
}
.im-pop {
  animation: im-pop 3s var(--lp-ease) infinite;
}
@keyframes im-pop {
  0%,
  55%,
  100% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.18);
  }
  35% {
    transform: scale(0.97);
  }
}
.im-label {
  position: absolute;
  left: 50%;
  top: calc(100% + 4px);
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 7px;
  font-weight: 700;
  color: var(--lp-ink-2);
}
.im-dock {
  position: absolute;
  inset-inline: 12px;
  bottom: 8px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
}
.im-dock-app {
  aspect-ratio: 1;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
}
</style>
