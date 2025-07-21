import { create } from 'zustand'

type ErrorStore = {
    error: string | null
    isSheetOpen: boolean
    onOpenSheet: () => void
    onCloseSheet: () => void
    setError: (err: string) => void
    clearError: () => void
}

const useAppError = create<ErrorStore>((set) => ({
    error: null,
    isSheetOpen: false,
    onOpenSheet: () => set({ isSheetOpen: true }),
    onCloseSheet: () => set({ isSheetOpen: false }),
    setError: (err: string) => set({ error: err }),
    clearError: () => set({ error: null }),
}))

export default useAppError
