<script setup lang="ts">
/**
 * Abstract illustrations of the citizen app, one per `variant`.
 *
 * These are deliberately not screenshots or faithful UI: rows of text become
 * grey placeholder bars, logos become plain colour wells, and each panel keeps
 * at most one short label and a couple of accents. What is left is the shape of
 * the screen — a list, a progress card, a checklist — which is what the copy
 * beside it is talking about.
 *
 * Colours follow the app's own markers: violet for ambulance units, brand red
 * for the primary action, emerald for progress.
 */
defineProps<{ variant: "units" | "trip" | "triage" | "rating" | "dock" }>();

/**
 * Two rows only. Three turned the list into a wall of bars, and the chips at
 * the end of each row added a third colour per line for no extra meaning.
 */
const unitRows = [
  { w: "w-[62%]", sub: "w-[38%]", sq: "am-sq--violet", bar: "!bg-[#8b5cf6]" },
  { w: "w-[48%]", sub: "w-[30%]", sq: "am-sq--sky", bar: "!bg-[#4a90e2]" },
];

/** Question widths for the triage panel — two questions, not three. */
const rowWidths = ["w-[62%]", "w-[48%]"];
</script>

<template>
  <!-- ── Nearby units ──────────────────────────────────────────────────── -->
  <div v-if="variant === 'units'" class="am-panel">
    <div class="flex items-center gap-2.5">
      <span class="am-sq am-sq--violet"><span class="am-bar w-4 !bg-[#8b5cf6]" /></span>
      <p class="am-label">Ambulance</p>
      <span class="ml-auto flex gap-1">
        <span class="am-dot h-5 w-5 bg-[var(--lp-surface-2)]" />
        <span class="am-dot h-5 w-5 bg-[var(--lp-surface-2)]" />
      </span>
    </div>

    <ul class="mt-3.5 space-y-3.5">
      <li v-for="(r, i) in unitRows" :key="i" class="flex items-center gap-2.5">
        <span :class="['am-sq', r.sq]"><span class="am-bar w-4" :class="r.bar" /></span>
        <span class="min-w-0 flex-1 space-y-1.5">
          <span class="am-bar am-bar--dark block" :class="r.w" />
          <span class="am-bar block" :class="r.sub" />
        </span>
      </li>
    </ul>

    <!-- Spill: an ETA chip that escaped the list, echoing the distance column. -->
    <span class="am-spill -right-3 top-[46%]">
      <span class="am-dot h-2.5 w-2.5 bg-[#8b5cf6]" />
      <span class="am-bar w-7 !bg-[#8b5cf6]/40" />
    </span>
  </div>

  <!-- ── Live ticket ───────────────────────────────────────────────────── -->
  <div v-else-if="variant === 'trip'" class="am-panel am-panel--fill">
    <div>
      <div class="flex items-center gap-2">
        <span class="am-dot h-1.5 w-1.5 bg-emerald-500" />
        <span class="am-bar am-bar--dark w-16" />
        <span class="am-dot ml-auto h-5 w-5 bg-[var(--lp-surface-2)]" />
      </div>

      <div class="mt-3.5 flex items-center gap-2.5">
        <span class="am-sq am-sq--violet"><span class="am-bar w-4 !bg-[#8b5cf6]" /></span>
        <span class="min-w-0 flex-1 space-y-1.5">
          <span class="am-bar am-bar--dark block w-[58%]" />
          <span class="am-bar block w-[36%]" />
        </span>
      </div>
    </div>

    <div class="flex gap-1">
      <span v-for="i in 4" :key="i" class="h-1.5 flex-1 rounded-full" :class="i <= 3 ? 'bg-emerald-500' : 'bg-[var(--lp-line)]'" />
    </div>

    <div class="flex items-center gap-2.5 border-t border-[var(--lp-line)] pt-3">
      <span class="am-sq am-sq--red"><span class="am-bar w-3 !bg-[#dc2626]" /></span>
      <span class="min-w-0 flex-1 space-y-1.5">
        <span class="am-bar am-bar--dark block w-[52%]" />
        <span class="am-bar block w-[74%]" />
      </span>
      <span class="am-dot flex h-8 w-8 items-center justify-center bg-[var(--lp-ink)]">
        <span class="am-dot h-1.5 w-1.5 bg-white/85" />
      </span>
    </div>

    <!-- Spill: the countdown floating off the card, like the notification it is. -->
    <span class="am-spill am-spill--round -right-2.5 top-5">
      <span class="am-badge !h-full !w-full">13<span class="am-badge-unit">mnt</span></span>
    </span>
  </div>

  <!-- ── Triage checklist ──────────────────────────────────────────────── -->
  <div v-else-if="variant === 'triage'" class="am-panel">
    <div class="flex items-center gap-2.5 border-b border-dashed border-[var(--lp-line)] pb-3">
      <span class="am-dot h-6 w-6 bg-[#8b5cf6]/20" />
      <span class="am-bar am-bar--dark w-[46%]" />
    </div>

    <ul class="mt-3.5 space-y-4">
      <li v-for="(pick, i) in [0, 1]" :key="i">
        <span class="am-bar am-bar--dark mb-2 block" :class="rowWidths[i]" />
        <div class="flex gap-1 overflow-hidden rounded-lg bg-[var(--lp-surface-2)] p-1">
          <span
            v-for="s in 3"
            :key="s"
            class="h-3.5 flex-1 rounded-md"
            :class="s - 1 === pick ? 'bg-[#dc2626]' : 'bg-white'"
          />
        </div>
      </li>
    </ul>

    <!-- Spill: the severity tag the checklist produced, riding on the panel edge. -->
    <span class="am-spill -right-3 top-4">
      <span class="am-dot h-2.5 w-2.5 bg-[#dc2626]" />
      <span class="am-bar w-8 !bg-[#dc2626]/40" />
    </span>
  </div>

  <!-- ── Rating ────────────────────────────────────────────────────────── -->
  <div v-else-if="variant === 'rating'" class="am-panel am-panel--fill">
    <span class="am-bar am-bar--dark block w-[60%]" />

    <div class="flex gap-2">
      <span class="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#dc2626]/10 py-2.5">
        <span class="am-dot h-3.5 w-3.5 bg-[#dc2626]" />
        <span class="am-bar w-9 !bg-[#dc2626]/45" />
      </span>
      <span class="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 ring-1 ring-[var(--lp-line)]">
        <span class="am-dot h-3.5 w-3.5 bg-[var(--lp-surface-2)]" />
        <span class="am-bar w-7" />
      </span>
    </div>

    <div class="space-y-2 rounded-xl bg-[var(--lp-surface)] p-3">
      <span class="am-bar am-bar--dark block w-[86%]" />
      <span class="am-bar block w-[64%]" />
    </div>

    <span class="flex h-10 items-center justify-center rounded-xl bg-[#dc2626]">
      <span class="am-bar w-20 !bg-white/75" />
    </span>

    <!-- Spill: a rating that has already been given, before the form is sent. -->
    <span class="am-spill -right-3 top-3">
      <span v-for="s in 3" :key="s" class="am-dot h-2.5 w-2.5 bg-amber-400" />
    </span>
  </div>

  <!-- ── Map and dock ──────────────────────────────────────────────────── -->
  <div v-else class="am-panel relative p-0">
    <!-- Clipping lives on this inner layer, so the spill below can still escape. -->
    <div class="absolute inset-0 overflow-hidden rounded-[18px]" aria-hidden="true">
      <svg viewBox="0 0 300 210" preserveAspectRatio="xMidYMid slice" class="h-full w-full">
        <rect width="300" height="210" fill="#eef1ea" />
        <path d="M-20 -10 h130 v74 h-130 Z" fill="#e2ebdb" />
        <g stroke="#fff" fill="none" stroke-linecap="round">
          <path d="M-10 66 q90 -18 160 26 t160 -10" stroke-width="11" />
          <path d="M74 -10 q10 92 -6 152 t14 74" stroke-width="8" />
          <path d="M214 -10 q-10 82 12 132" stroke-width="5" />
          <path d="M-10 154 q80 14 140 -8 t180 16" stroke-width="4" />
        </g>
        <circle cx="152" cy="88" r="8" fill="#2f80ed" stroke="#fff" stroke-width="3" />
      </svg>
    </div>

    <div class="relative flex h-full flex-col justify-end gap-3 p-3">
      <div class="flex items-center gap-2 rounded-full bg-white px-3 py-2.5 shadow-[0_10px_24px_-14px_rgba(28,25,23,0.5)]">
        <span class="am-dot h-3.5 w-3.5 bg-[var(--lp-surface-2)]" />
        <span class="am-bar h-2 flex-1 !bg-[var(--lp-surface-2)]" />
        <span class="am-dot flex h-6 w-6 items-center justify-center bg-[var(--lp-ink)]">
          <span class="am-dot h-1.5 w-1.5 bg-white/85" />
        </span>
      </div>

      <div class="grid grid-cols-4 gap-1.5 rounded-2xl bg-white/95 px-2 py-3 backdrop-blur">
        <div
          v-for="c in [
            { bg: 'bg-[var(--lp-surface-2)]', dot: 'bg-[var(--lp-faint)]' },
            { bg: 'bg-[#fbd5d5]', dot: 'bg-[#dc2626]' },
            { bg: 'bg-[#fbd5d5]', dot: 'bg-[#dc2626]' },
            { bg: 'bg-[var(--lp-surface-2)]', dot: 'bg-[var(--lp-faint)]' },
          ]"
          :key="c.dot + c.bg"
          class="flex flex-col items-center gap-1.5"
        >
          <span class="am-dot flex h-9 w-9 items-center justify-center" :class="c.bg">
            <span class="am-dot h-2.5 w-2.5" :class="c.dot" />
          </span>
          <span class="am-bar h-1.5 w-7" />
        </div>
      </div>
    </div>

    <!-- Spill: a pin dropped on the map, just outside the panel. -->
    <span class="am-spill am-spill--round -left-3 top-8">
      <span class="am-dot h-3.5 w-3.5 bg-[#dc2626]" />
    </span>
  </div>
</template>

<style scoped>
/* White product panel that sits inside a colour card. Column flow so a panel
   stretched by a taller neighbour can spread its rows instead of leaving a
   hole at the bottom. */
.am-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: #fff;
  padding: 16px;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.04),
    0 14px 28px -22px rgba(28, 25, 23, 0.28);
}

/* The one element per illustration allowed outside the panel's box. It rides on
   the panel edge so the mock has some depth instead of reading as a flat
   screenshot; the card's own overflow is what keeps it from escaping the card. */
.am-spill {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: #fff;
  padding: 6px 10px;
  box-shadow:
    0 0 0 1px rgba(28, 25, 23, 0.05),
    0 10px 18px -10px rgba(28, 25, 23, 0.32);
}
.am-spill--round {
  width: 34px;
  height: 34px;
  justify-content: center;
  padding: 0;
}

.am-panel--fill {
  justify-content: space-between;
  gap: 12px;
}

/* The one piece of real type a panel is allowed. */
.am-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--lp-ink);
}

/* Placeholder bar that stands in for a line of text. */
.am-bar {
  display: block;
  height: 9px;
  border-radius: 999px;
  background: #e6e3df;
}
.am-bar--dark {
  background: #d6d1cc;
}

/* Rounded square that stands in for a unit logo. A soft fill with one solid
   shape inside: the earlier solid-block version carried too much colour for a
   grid of five cards. */
.am-sq {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--lp-surface-2);
}
.am-sq--violet {
  background: #ede9fe;
}
.am-sq--sky {
  background: #dbeafe;
}
.am-sq--amber {
  background: #fef3c7;
}
.am-sq--red {
  background: #fee2e2;
}

.am-dot {
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 999px;
}

/* The countdown bubble on the live ticket. */
.am-badge {
  display: flex;
  height: 42px;
  width: 42px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.1);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: #b91c1c;
}
.am-badge-unit {
  margin-top: 2px;
  font-size: 8.5px;
  font-weight: 500;
}
</style>
