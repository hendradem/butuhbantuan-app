/**
 * Drop-in replacement for vue3-hot-toast → top-right flash cards.
 * Keeps call sites as toast.success / toast.error / toast("…").
 */
import { useFlashNotify } from "~/composables/useFlashNotify";

type ToastOpts = { duration?: number };

function asTitleBody(message: string): { title: string; body?: string } {
  const parts = String(message || "")
    .split(/\n|·/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { title: message };
  return { title: parts[0], body: parts.slice(1).join(" · ") };
}

function toastFn(message: string, opts?: ToastOpts) {
  const { title, body } = asTitleBody(message);
  useFlashNotify().info(title, { body, duration: opts?.duration });
}

export const toast = Object.assign(toastFn, {
  success(message: string, opts?: ToastOpts) {
    const { title, body } = asTitleBody(message);
    useFlashNotify().success(title, { body, duration: opts?.duration });
  },
  error(message: string, opts?: ToastOpts) {
    const { title, body } = asTitleBody(message);
    useFlashNotify().error(title, { body, duration: opts?.duration });
  },
});

export default toast;
