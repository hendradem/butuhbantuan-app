/**
 * Global bottom-sheet stacking: last opened sheet always gets the highest z-index.
 */
export const useSheetStackStore = defineStore("sheetStack", () => {
  const BASE = 10000;
  const STEP = 10;

  let seq = 0;
  const layers = ref(new Map<string, number>());

  function acquire(id: string): number {
    seq += 1;
    const z = BASE + seq * STEP;
    const next = new Map(layers.value);
    next.set(id, z);
    layers.value = next;
    return z;
  }

  function release(id: string) {
    if (!layers.value.has(id)) return;
    const next = new Map(layers.value);
    next.delete(id);
    layers.value = next;
  }

  function zFor(id: string): number {
    return layers.value.get(id) ?? BASE;
  }

  function clear() {
    seq = 0;
    layers.value = new Map();
  }

  return { acquire, release, zFor, clear, layers };
});
