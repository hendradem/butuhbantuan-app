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
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = Math.max(1800, input.duration ?? 4500);
    const item: FlashItem = {
      id,
      title: input.title,
      body: input.body,
      kind: input.kind ?? "info",
      duration,
      startedAt: Date.now(),
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
