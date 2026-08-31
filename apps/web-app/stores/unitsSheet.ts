export const useUnitsSheetStore = defineStore("unitsSheet", {
  state: () => ({
    isOpen: false,
  }),
  actions: {
    onOpen() {
      this.isOpen = true;
    },
    onClose() {
      this.isOpen = false;
    },
  },
});
