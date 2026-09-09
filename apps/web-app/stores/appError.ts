export const useAppErrorStore = defineStore("appError", {
  state: () => ({
    error: null as string | null,
    isSheetOpen: false,
    errorMessage: "",
  }),
  actions: {
    onOpenSheet() { this.isSheetOpen = true; },
    onCloseSheet() { this.isSheetOpen = false; },
    setError(err: string) { this.error = err; },
    setErrorMessage(msg: string) { this.errorMessage = msg; },
    clearError() { this.error = null; },
  },
});
