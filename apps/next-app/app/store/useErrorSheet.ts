import { create } from 'zustand'

interface SheetStore {
    isOpen: boolean
    errorMessage: string
    onOpen: () => void
    onClose: () => void
    setErrorMessage: (message: string) => void
}

const useErrorSheet = create<SheetStore>((set) => ({
    isOpen: false,
    errorMessage: '',

    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    setErrorMessage: (message: string) => set({ errorMessage: message }),
}))

export default useErrorSheet
