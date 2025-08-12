import { create } from 'zustand'

interface CoreSheetType {
    isOpen: boolean
    onOpen: () => void
    onClose: () => void
}

const useCoreSheet = create<CoreSheetType>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}))

export default useCoreSheet
