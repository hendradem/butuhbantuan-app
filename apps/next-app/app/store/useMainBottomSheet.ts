import { create } from 'zustand'

interface BottomSheetStore {
    isOpen: boolean
    isFullScreen: boolean
    onOpen: () => void
    onClose: () => void
    onFullScreen: () => void
    onExitFullScreen: () => void
}

const useMainBottomSheet = create<BottomSheetStore>((set) => ({
    isOpen: true,
    isFullScreen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onFullScreen: () => set({ isFullScreen: true }),
    onExitFullScreen: () => set({ isFullScreen: false }),
}))

export default useMainBottomSheet
