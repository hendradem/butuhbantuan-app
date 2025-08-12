import { create } from 'zustand'

interface SearchSheet {
    isOpen: boolean
    snapPoint: number
    onOpen: () => void
    onClose: () => void
    onSnap: (snapPoint: number) => void
}

const useSearchSheet = create<SearchSheet>((set) => ({
    isOpen: false,
    snapPoint: 1, // default snap point
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onSnap: (snapPoint: number) => set({ snapPoint }),
}))

export default useSearchSheet
