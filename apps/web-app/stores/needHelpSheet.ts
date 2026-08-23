export const useNeedHelpSheetStore = defineStore("needHelpSheet", {
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
