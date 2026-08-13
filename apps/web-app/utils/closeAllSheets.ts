/**
 * Close every bottom sheet + clear stack. Used when leaving e-ticket / resetting home.
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
  useAppErrorStore().onCloseSheet();
  useSheetStackStore().clear();
}
