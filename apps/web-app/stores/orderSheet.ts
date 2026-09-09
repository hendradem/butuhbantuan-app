export const useOrderSheetStore = defineStore("orderSheet", {
  state: () => ({
    isOpen: false,
    emergencyUUID: "",
    unitName: "",
    callType: "" as "whatsapp" | "phone" | "",
    callNumber: "",
    waDispatch: false,
  }),
  actions: {
    open(
      emergencyUUID: string,
      unitName: string,
      callType: "whatsapp" | "phone",
      callNumber: string,
      opts?: { waDispatch?: boolean },
    ) {
      this.emergencyUUID = emergencyUUID;
      this.unitName = unitName;
      this.callType = callType;
      this.callNumber = callNumber;
      this.waDispatch = opts?.waDispatch === true;
      this.isOpen = true;
    },
    onClose() {
      this.isOpen = false;
    },
  },
});
