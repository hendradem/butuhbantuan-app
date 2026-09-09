/**
 * Refresh that keeps dashboard scroll position(s).
 * Pair with skeleton gates that only show on initial load (`isInitialPending`).
 * Do not use for onActivated after route change — call the raw refresh instead.
 *
 * Any element with `[data-dashboard-scroll]` is restored (main + nested panes).
 */
export function useSoftRefresh(refreshFn: () => Promise<void> | void) {
  return async () => {
    if (!import.meta.client) {
      await refreshFn();
      return;
    }

    const path = `${window.location.pathname}${window.location.search}`;
    const snaps = snapshotScrolls();

    await refreshFn();

    const restore = () => {
      const still = `${window.location.pathname}${window.location.search}`;
      if (still !== path) return;
      restoreScrolls(snaps);
    };

    await nextTick();
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    // Late layout (images, table reflow, keepalive)
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 160);
  };
}

function snapshotScrolls(): { el: HTMLElement; top: number; left: number }[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-dashboard-scroll]")).map(
    (el) => ({ el, top: el.scrollTop, left: el.scrollLeft }),
  );
}

function restoreScrolls(snaps: { el: HTMLElement; top: number; left: number }[]) {
  for (const { el, top, left } of snaps) {
    if (!el.isConnected) continue;
    el.scrollTop = top;
    el.scrollLeft = left;
  }
}

/** True only before first successful payload — not during background refresh. */
export function isInitialPending(pending: boolean, data: unknown) {
  return pending && data == null;
}
