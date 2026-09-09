export const useSosStore = defineStore("sos", {
  state: () => ({
    isOpen: false,
    isSubmitting: false,
    error: null as string | null,
  }),
  actions: {
    open() { this.isOpen = true; this.error = null; },
    close() { this.isOpen = false; this.error = null; this.isSubmitting = false; },
    setSubmitting(v: boolean) { this.isSubmitting = v; },
    setError(msg: string | null) { this.error = msg; this.isSubmitting = false; },
  },
});
