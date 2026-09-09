export const useCoreSheetStore = defineStore("coreSheet", {
  state: () => ({ isOpen: false }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
  },
});
