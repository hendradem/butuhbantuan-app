/**
 * TEMPORARY diagnostic — shows uncaught Vue / JS errors as a toast, so a bug
 * that only reproduces on a phone can be read off the screen instead of a
 * console. Remove this file once the filter-button error is tracked down.
 */
import { toast } from "vue3-hot-toast";

/** Its own id: the app toast has a single shared slot that would replace this. */
const REPORT_TOAST_ID = "bb-error-report";
const DEDUPE_MS = 5000;

const lastSeen = new Map<string, number>();

function report(source: string, err: unknown, where?: string) {
  try {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err ?? "unknown");

    const text = [source, message, where].filter(Boolean).join(" · ");
    const now = Date.now();
    if (now - (lastSeen.get(text) ?? 0) < DEDUPE_MS) return;
    lastSeen.set(text, now);

    console.error("[bb-error]", source, err, where ?? "");
    toast.error(text, { id: REPORT_TOAST_ID, duration: 20000 });
  } catch {
    /* A reporter must never be the thing that breaks the page. */
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    const name =
      (instance as { $options?: { name?: string }; type?: { __name?: string } })?.$options
        ?.name ??
      (instance as { type?: { __name?: string } })?.type?.__name ??
      "component";
    report(`Vue/${info}`, err, `<${name}>`);
  };

  window.addEventListener("error", (event) => {
    report("JS", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    report("Promise", event.reason);
  });
});
