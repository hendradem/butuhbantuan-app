export type FlashKind = "success" | "error" | "info";

export type FlashItem = {
  id: string;
  title: string;
  body?: string;
  kind: FlashKind;
  duration: number;
  startedAt: number;
};

const MAX_FLASH = 4;

/** Module-level timers — never put Timeout handles in useState (breaks Nuxt payload). */
const flashTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Recently-pushed keys → timestamp. Prevents identical toasts from stacking
 * when the same event triggers both a local user-action toast and an SSE echo
 * toast within the same tick. Cleared as items dismiss / after the window.
 */
const recentKeyAt = new Map<string, number>();
const DEDUP_WINDOW_MS = 1500;

function makeKey(title: string, body: string | undefined, kind: FlashKind) {
  return `${kind}::${title}::${body ?? ""}`;
}

/** Top-right flash cards (replaces vue3-hot-toast for dashboard UX). */
export function useFlashNotify() {
  const items = useState<FlashItem[]>("app-flash-notify", () => []);

  function dismiss(id: string) {
    items.value = items.value.filter((n) => n.id !== id);
    const t = flashTimers.get(id);
    if (t) {
      clearTimeout(t);
      flashTimers.delete(id);
    }
  }

  function push(input: {
    title: string;
    body?: string;
    kind?: FlashKind;
    duration?: number;
  }) {
    if (!import.meta.client) return "";
    const kind: FlashKind = input.kind ?? "info";
    const key = makeKey(input.title, input.body, kind);
    const now = Date.now();
    const lastAt = recentKeyAt.get(key) ?? 0;
    if (now - lastAt < DEDUP_WINDOW_MS) {
      // Identical toast just pushed — swallow the duplicate. The first one is
      // still on screen and covers the notification.
      return "";
    }
    recentKeyAt.set(key, now);
    // Occasional cleanup so the map doesn't grow forever.
    if (recentKeyAt.size > 100) {
      for (const [k, t] of recentKeyAt) {
        if (now - t > DEDUP_WINDOW_MS * 2) recentKeyAt.delete(k);
      }
    }

    const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = Math.max(1800, input.duration ?? 4500);
    const item: FlashItem = {
      id,
      title: input.title,
      body: input.body,
      kind,
      duration,
      startedAt: now,
    };
    items.value = [item, ...items.value].slice(0, MAX_FLASH);
    flashTimers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
    return id;
  }

  function success(title: string, opts?: { body?: string; duration?: number }) {
    return push({ title, body: opts?.body, kind: "success", duration: opts?.duration });
  }

  function error(title: string, opts?: { body?: string; duration?: number }) {
    return push({ title, body: opts?.body, kind: "error", duration: opts?.duration ?? 5500 });
  }

  function info(title: string, opts?: { body?: string; duration?: number }) {
    return push({ title, body: opts?.body, kind: "info", duration: opts?.duration });
  }

  return { items, push, success, error, info, dismiss };
}
