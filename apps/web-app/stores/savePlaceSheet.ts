export type SavePlaceMode = "save" | "remove";

export const useSavePlaceSheetStore = defineStore("savePlaceSheet", {
  state: () => ({
    isOpen: false,
    mode: "save" as SavePlaceMode,
    editId: "" as string,
  }),
  actions: {
    openSave(editId?: string) {
      this.mode = "save";
      this.editId = editId || "";
      this.isOpen = true;
    },
    openRemove(editId: string) {
      this.mode = "remove";
      this.editId = editId;
      this.isOpen = true;
    },
    onClose() {
      this.isOpen = false;
    },
  },
});
