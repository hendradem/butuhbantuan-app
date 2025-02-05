import { create } from 'zustand'

interface BottomSheetStore {
    isOpen: boolean
    onOpen: () => void
    onClose: () => void
    onTest: () => void
}

const useBottomSheet = create<BottomSheetStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onTest: () => set({ isOpen: true }),
}))

export default useBottomSheet
