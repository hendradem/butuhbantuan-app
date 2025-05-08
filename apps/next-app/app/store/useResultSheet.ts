import { create } from 'zustand'

interface ResultSheetState {
    isOpen: boolean
    results: string[]
    addResult: (result: string) => void
    clearResults: () => void
    setOpen: (isOpen: boolean) => void
}

const useResultSheet = create<ResultSheetState>((set) => ({
    isOpen: false,
    results: [],
    addResult: (result) =>
        set((state) => ({ results: [...state.results, result] })),
    clearResults: () => set({ results: [] }),
    setOpen: (isOpen) => set({ isOpen }),
}))

export default useResultSheet
