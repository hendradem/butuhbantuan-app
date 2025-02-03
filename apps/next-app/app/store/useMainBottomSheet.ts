import { create } from 'zustand'

interface BottomSheetStore {
    isOpen: boolean
    onOpen: () => void
    onClose: () => void
}

const useMainBottomSheet = create<BottomSheetStore>((set) => ({
    isOpen: true,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}))

export default useMainBottomSheet
