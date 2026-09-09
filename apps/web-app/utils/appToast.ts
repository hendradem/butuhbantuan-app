import { toast } from "vue3-hot-toast";

/** Single shared toast slot — loading/success/error replace each other. */
export const APP_TOAST_ID = "bb-app-toast";

export function appToast() {
  return {
    loading(message: string) {
      // Stay until success/error/dismiss — default duration drops the loader mid-fetch.
      return toast.loading(message, { id: APP_TOAST_ID, duration: Infinity });
    },
    success(message: string, opts?: { duration?: number }) {
      return toast.success(message, {
        id: APP_TOAST_ID,
        duration: opts?.duration ?? 2500,
      });
    },
    error(message: string, opts?: { duration?: number }) {
      return toast.error(message, {
        id: APP_TOAST_ID,
        duration: opts?.duration ?? 3500,
      });
    },
    dismiss() {
      toast.dismiss(APP_TOAST_ID);
    },
  };
}
