/**
 * Space taken by banners pinned to the top of the map screen (offline notice,
 * install prompt) so the ticket island can sit below them instead of hiding
 * them. Banners register their own height; the island reads the total.
 */

const STATE_KEY = "bb-top-insets";

function insetState() {
  return useState<Record<string, number>>(STATE_KEY, () => ({}));
}

/** Attach the returned ref to a top-pinned banner's outermost element. */
export function useTopInset(id: string) {
  const insets = insetState();
  const el = ref<HTMLElement | null>(null);

  function write(height: number) {
    if (insets.value[id] === height) return;
    insets.value = { ...insets.value, [id]: height };
  }

  // The ref flips between null and the element as the banner shows and hides.
  watch(el, (node) => {
    if (!node) {
      write(0);
      return;
    }
    void nextTick(() => write(node.offsetHeight));
  });

  onBeforeUnmount(() => {
    const next = { ...insets.value };
    delete next[id];
    insets.value = next;
  });

  return el;
}

/** Top banners overlap each other, so the tallest one is what must be cleared. */
export function useTopInsetOffset() {
  const insets = insetState();
  return computed(() => Math.max(0, ...Object.values(insets.value)));
}
