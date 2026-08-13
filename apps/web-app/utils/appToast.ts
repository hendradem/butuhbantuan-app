import { toast } from "vue3-hot-toast";

/** Single shared toast slot — loading/success/error replace each other. */
export const APP_TOAST_ID = "bb-app-toast";

export function appToast() {
  return {
    loading(message: string) {
      return toast.loading(message, { id: APP_TOAST_ID });
    },
    success(message: string, opts?: { duration?: number }) {
      return toast.success(message, { id: APP_TOAST_ID, ...opts });
    },
    error(message: string) {
      return toast.error(message, { id: APP_TOAST_ID });
    },
    dismiss() {
      toast.dismiss(APP_TOAST_ID);
      toast.dismiss();
    },
  };
}
