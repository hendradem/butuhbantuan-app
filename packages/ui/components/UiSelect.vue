<script setup lang="ts">
/**
 * Custom listbox select.
 * Menu is teleported to body with fixed positioning so parent overflow
 * (UiCard, UiTableCard, etc.) cannot clip it. Uses pointer-events:auto and
 * clears aria-hidden so it still works inside reka-ui Dialog.
 */
import {
  Comment,
  Fragment,
  computed,
  isVNode,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useSlots,
  watch,
  type VNode,
  type VNodeArrayChildren,
} from "vue";
import { placeAnchoredMenu, refineAnchoredMenuTop } from "../utils/placeAnchoredMenu";

defineOptions({ inheritAttrs: false });

export type UiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    disabled?: boolean;
    placeholder?: string;
    invalid?: boolean;
    searchable?: boolean | null;
    searchableWhen?: number;
    options?: UiSelectOption[];
    searchPlaceholder?: string;
  }>(),
  {
    searchable: null,
    searchableWhen: 8,
    searchPlaceholder: "Cari…",
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string]; change: [value: string] }>();

const slots = useSlots();
const rootEl = ref<HTMLElement | null>(null);
const menuEl = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const open = ref(false);
const openUp = ref(false);
const query = ref("");
const menuStyle = ref<Record<string, string>>({});

let ariaObserver: MutationObserver | null = null;

type Opt = { value: string; label: string; disabled: boolean };
const slotOptions = ref<Opt[]>([]);

function textOf(node: VNode): string {
  if (typeof node.children === "string") return node.children;
  if (Array.isArray(node.children)) {
    return node.children
      .map((c) => {
        if (typeof c === "string" || typeof c === "number") return String(c);
        if (isVNode(c)) return textOf(c);
        return "";
      })
      .join("");
  }
  return "";
}

function walkOptions(nodes: VNodeArrayChildren, out: Opt[]) {
  for (const n of nodes) {
    if (n == null || typeof n === "string" || typeof n === "number" || typeof n === "boolean") continue;
    if (!isVNode(n) || n.type === Comment) continue;
    if (n.type === Fragment && Array.isArray(n.children)) {
      walkOptions(n.children as VNodeArrayChildren, out);
      continue;
    }
    if (n.type === "option") {
      const p = (n.props || {}) as Record<string, unknown>;
      const value = p.value != null ? String(p.value) : "";
      const label = textOf(n).trim() || value;
      out.push({
        value,
        label,
        disabled: p.disabled === true || p.disabled === "" || p.disabled === "disabled",
      });
    }
  }
}

function syncOptions() {
  const out: Opt[] = [];
  walkOptions(slots.default?.() ?? [], out);
  slotOptions.value = out;
}

const allOptions = computed<Opt[]>(() => {
  const fromProps = (props.options ?? []).map((o) => ({
    value: String(o.value),
    label: String(o.label ?? o.value),
    disabled: !!o.disabled,
  }));
  if (slotOptions.value.length) {
    const seen = new Set(slotOptions.value.map((o) => o.value));
    return [...slotOptions.value, ...fromProps.filter((o) => !seen.has(o.value))];
  }
  return fromProps;
});

const isSearchable = computed(() => {
  if (props.searchable === true) return true;
  if (props.searchable === false) return false;
  return allOptions.value.length >= (props.searchableWhen ?? 8);
});

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q || !isSearchable.value) return allOptions.value;
  return allOptions.value.filter(
    (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
});

const displayLabel = computed(() => {
  const v = props.modelValue == null ? "" : String(props.modelValue);
  const hit = allOptions.value.find((o) => o.value === v);
  if (hit) return hit.label;
  if (props.placeholder && !v) return props.placeholder;
  return v || props.placeholder || "Pilih";
});

const isPlaceholder = computed(() => {
  const v = props.modelValue == null ? "" : String(props.modelValue);
  return !v && !!props.placeholder;
});

function applyMenuStyle(rect: DOMRect, top: number, flip: boolean) {
  openUp.value = flip;
  const left = rect.left;
  const maxRight = (typeof window !== "undefined" ? window.innerWidth : 1200) - 8;
  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    minWidth: `${rect.width}px`,
    maxWidth: `${Math.max(rect.width, maxRight - left)}px`,
    transform: flip ? "translateY(-100%)" : "",
    pointerEvents: "auto",
  };
}

function updatePosition() {
  if (!rootEl.value || !open.value) return;
  const rect = rootEl.value.getBoundingClientRect();
  const est = Math.min(280, 52 + Math.max(filteredOptions.value.length, 1) * 36);
  const pos = placeAnchoredMenu(rect, {
    menuHeight: est,
    gap: 4,
    alignRight: false,
    menuWidth: rect.width,
  });
  applyMenuStyle(rect, pos.top, pos.openUp);
}

function keepMenuInteractive() {
  const el = menuEl.value;
  if (!el) return;
  el.style.pointerEvents = "auto";
  el.removeAttribute("aria-hidden");
  ariaObserver?.disconnect();
  ariaObserver = new MutationObserver(() => {
    if (el.getAttribute("aria-hidden") === "true") {
      el.removeAttribute("aria-hidden");
    }
  });
  ariaObserver.observe(el, { attributes: true, attributeFilter: ["aria-hidden"] });
}

async function placeMenu() {
  await nextTick();
  updatePosition();
  await nextTick();
  if (menuEl.value && rootEl.value) {
    const rect = rootEl.value.getBoundingClientRect();
    const refined = refineAnchoredMenuTop(rect, menuEl.value, openUp.value, 4);
    applyMenuStyle(rect, refined.top, refined.openUp);
    keepMenuInteractive();
  }
}

function closeMenu() {
  open.value = false;
  query.value = "";
  ariaObserver?.disconnect();
  ariaObserver = null;
}

async function toggle() {
  if (props.disabled) return;
  if (open.value) {
    closeMenu();
    return;
  }
  syncOptions();
  query.value = "";
  open.value = true;
  await placeMenu();
  if (isSearchable.value) {
    // Defer so dialog focus trap settles first
    requestAnimationFrame(() => searchEl.value?.focus({ preventScroll: true }));
  }
}

function selectOpt(opt: Opt) {
  if (opt.disabled) return;
  emit("update:modelValue", opt.value);
  emit("change", opt.value);
  closeMenu();
}

/** Commit on pointerdown — click can be swallowed by dialog focus management. */
function onOptPointerDown(e: PointerEvent, opt: Opt) {
  if (opt.disabled) return;
  e.preventDefault();
  e.stopPropagation();
  selectOpt(opt);
}

function onDocPointer(e: Event) {
  if (!open.value) return;
  const t = e.target as Node;
  if (rootEl.value?.contains(t) || menuEl.value?.contains(t)) return;
  closeMenu();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    e.stopPropagation();
    closeMenu();
  }
}

function onScrollOrResize() {
  if (open.value) updatePosition();
}

watch(
  () => props.options,
  () => {
    if (!open.value) syncOptions();
  },
  { deep: true },
);

watch(filteredOptions, () => {
  if (open.value) void placeMenu();
});

onMounted(() => {
  syncOptions();
  document.addEventListener("pointerdown", onDocPointer, true);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onScrollOrResize);
  document.addEventListener("scroll", onScrollOrResize, true);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocPointer, true);
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", onScrollOrResize);
  document.removeEventListener("scroll", onScrollOrResize, true);
  ariaObserver?.disconnect();
  ariaObserver = null;
});
</script>

<template>
  <span
    ref="rootEl"
    data-slot="control"
    data-ui-select
    :class="[
      'group relative block w-full',
      open ? 'z-[70]' : 'focus-within:z-30',
      'before:pointer-events-none before:absolute before:inset-px before:rounded-[calc(0.5rem-1px)] before:bg-white before:shadow-sm',
      'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset after:ring-transparent after:transition-shadow after:duration-150',
      open ? 'after:ring-2 after:ring-primary-500/40' : '',
      disabled ? 'opacity-50' : '',
      $attrs.class,
    ]"
  >
    <button
      type="button"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :class="[
        'relative z-[1] flex w-full items-center rounded-lg bg-transparent text-left',
        'py-[calc(0.375rem-1px)] pl-[calc(0.75rem-1px)] pr-8',
        'text-sm/6',
        isPlaceholder ? 'text-neutral-400' : 'text-neutral-950',
        open
          ? 'border border-primary-400'
          : invalid
            ? 'border border-emergency-500 hover:border-emergency-500'
            : 'border border-neutral-950/10 hover:border-neutral-950/20',
        'focus:outline-none transition-colors',
        'disabled:border-neutral-950/20 disabled:cursor-not-allowed',
      ]"
      @click.stop="toggle"
    >
      <span class="truncate">{{ displayLabel }}</span>
    </button>

    <span class="pointer-events-none absolute inset-y-0 right-0 z-[2] flex items-center pr-2">
      <svg
        class="size-4 stroke-neutral-500 transition-transform duration-200 ease-in-out"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5.75 10.75L8 13L10.25 10.75" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M10.25 5.25L8 3L5.75 5.25" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </span>

  <Teleport to="body">
    <div
      v-if="open"
      ref="menuEl"
      data-ui-select-menu
      role="listbox"
      :style="menuStyle"
      :class="[
        'fixed z-[200] rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden',
      ]"
      @pointerdown.stop
    >
      <div
        v-if="isSearchable"
        class="border-b border-neutral-100 bg-white p-2"
      >
        <div class="relative">
          <svg
            class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
              clip-rule="evenodd"
            />
          </svg>
          <input
            ref="searchEl"
            v-model="query"
            type="search"
            :placeholder="searchPlaceholder"
            class="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            @keydown.enter.prevent
            @keydown.escape.stop="closeMenu"
          >
        </div>
      </div>

      <ul class="max-h-[220px] overflow-y-auto py-1 overscroll-contain">
        <li
          v-if="!filteredOptions.length"
          class="px-3 py-2.5 text-sm text-neutral-400"
        >
          {{ allOptions.length ? "Tidak ditemukan" : "Tidak ada opsi" }}
        </li>
        <li
          v-for="opt in filteredOptions"
          :key="`${opt.value}::${opt.label}`"
          role="option"
          :aria-selected="String(modelValue ?? '') === opt.value"
          :aria-disabled="opt.disabled || undefined"
          :class="[
            'px-3 py-2 text-sm select-none',
            opt.disabled ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-800 hover:bg-neutral-50 cursor-pointer',
            String(modelValue ?? '') === opt.value ? 'bg-primary-50 text-primary-800 font-medium' : '',
          ]"
          @pointerdown="onOptPointerDown($event, opt)"
        >
          <span class="line-clamp-2">{{ opt.label }}</span>
        </li>
      </ul>
    </div>
  </Teleport>
</template>
