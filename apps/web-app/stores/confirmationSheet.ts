export const useConfirmationSheetStore = defineStore("confirmationSheet", {
  state: () => ({
    isOpen: false,
    callType: "default" as "whatsapp" | "phone" | "default",
    callNumber: "",
  }),
  actions: {
    onOpen() { this.isOpen = true; },
    onClose() { this.isOpen = false; },
    setCallType(type: "whatsapp" | "phone") { this.callType = type; },
    setCallNumber(number: string) { this.callNumber = number; },
  },
});
