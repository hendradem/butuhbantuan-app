export type MoreDetail = "about" | "support" | null;

export const useMoreSheetStore = defineStore("moreSheet", {
  state: () => ({
    isOpen: false,
    detail: null as MoreDetail,
  }),
  actions: {
    onOpen() {
      this.isOpen = true;
      this.detail = null;
    },
    onClose() {
      this.isOpen = false;
      this.detail = null;
    },
    openDetail(detail: Exclude<MoreDetail, null>) {
      this.isOpen = true;
      this.detail = detail;
    },
    closeDetail() {
      this.detail = null;
      this.isOpen = true;
    },
  },
});
