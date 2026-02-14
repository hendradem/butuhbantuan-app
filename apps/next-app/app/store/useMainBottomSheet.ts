import { create } from 'zustand'

interface BottomSheetStore {
    isOpen: boolean
    isFullScreen: boolean
    isMainBottomDetailSheetOpen: boolean
    onOpen: () => void
    onClose: () => void
    onFullScreen: () => void
    onExitFullScreen: () => void
    setMainBottomDetailSheetOpen: (status: boolean) => void
}

const useMainBottomSheet = create<BottomSheetStore>((set) => ({
    isOpen: true,
    isFullScreen: false,
    isMainBottomDetailSheetOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onFullScreen: () => set({ isFullScreen: true }),
    onExitFullScreen: () => set({ isFullScreen: false }),
    setMainBottomDetailSheetOpen: (status: boolean) =>
        set({ isMainBottomDetailSheetOpen: status }),
}))

export default useMainBottomSheet
