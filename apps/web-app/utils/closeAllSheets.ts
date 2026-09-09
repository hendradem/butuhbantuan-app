/**
 * Close every bottom sheet + clear map routes. Used when leaving e-ticket / resetting home.
 */
export function closeAllSheets() {
  useCoreSheetStore().onClose();
  useOrderSheetStore().onClose();
  useConfirmationSheetStore().onClose();
  useReviewSheetStore().onClose();
  useSearchSheetStore().onClose();
  useSavePlaceSheetStore().onClose();
  useExploreSheetStore().onClose();
  useDetailSheetStore().onClose();
  useMoreSheetStore().onClose();
  useSosStore().close();
  useNeedHelpSheetStore().onClose();
  useUnitsSheetStore().onClose();
  useAppErrorStore().onCloseSheet();
  useSheetStackStore().clear();
  useMapUrl().clearUnit();
  useMapRouting().clearRoute();
}
