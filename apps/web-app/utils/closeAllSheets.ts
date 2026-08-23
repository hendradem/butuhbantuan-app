/**
 * Close every bottom sheet + clear map routes. Used when leaving e-ticket / resetting home.
 */
export function closeAllSheets() {
  useCoreSheetStore().onClose();
  useOrderSheetStore().onClose();
  useConfirmationSheetStore().onClose();
  useReviewSheetStore().onClose();
  useSearchSheetStore().onClose();
  useExploreSheetStore().onClose();
  useDetailSheetStore().onClose();
  useMoreSheetStore().onClose();
  useSosStore().close();
  useNeedHelpSheetStore().onClose();
  useTicketSheetStore().close();
  useAppErrorStore().onCloseSheet();
  useSheetStackStore().clear();
  useLeafletStore().resetLeafletRouting();
}
