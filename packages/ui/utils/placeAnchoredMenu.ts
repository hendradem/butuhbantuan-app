/**
 * Place a fixed/teleported menu relative to a trigger rect.
 * When openUp, `top` is the bottom edge of the menu (use translateY(-100%)).
 */
export type AnchoredMenuPos = {
  top: number;
  right: number;
  left?: number;
  openUp: boolean;
};

export function placeAnchoredMenu(
  trigger: DOMRect,
  opts?: {
    menuHeight?: number;
    gap?: number;
    alignRight?: boolean;
    menuWidth?: number;
  },
): AnchoredMenuPos {
  const gap = opts?.gap ?? 4;
  const menuHeight = opts?.menuHeight ?? 220;
  const alignRight = opts?.alignRight !== false;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;

  const spaceBelow = vh - trigger.bottom;
  const spaceAbove = trigger.top;
  const openUp = spaceBelow < menuHeight + gap && spaceAbove > spaceBelow;

  const top = openUp
    ? Math.max(gap, trigger.top - gap)
    : Math.min(vh - gap, trigger.bottom + gap);

  if (alignRight) {
    return {
      top,
      right: Math.max(8, vw - trigger.right),
      openUp,
    };
  }

  const menuWidth = opts?.menuWidth ?? 208;
  let left = trigger.left;
  if (left + menuWidth > vw - 8) left = Math.max(8, vw - menuWidth - 8);
  return { top, right: 0, left, openUp };
}

export function refineAnchoredMenuTop(
  trigger: DOMRect,
  menuEl: HTMLElement,
  openUp: boolean,
  gap = 4,
): { top: number; openUp: boolean } {
  const h = menuEl.offsetHeight || 220;
  const vh = window.innerHeight;
  if (openUp || (trigger.bottom + gap + h > vh - 8 && trigger.top > h + gap)) {
    return { top: Math.max(gap, trigger.top - gap), openUp: true };
  }
  return { top: Math.min(trigger.bottom + gap, Math.max(gap, vh - h - 8)), openUp: false };
}
