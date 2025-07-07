import { create } from 'zustand'

interface DetailSheetStore {
    isOpen: boolean
    callType: 'whatsapp' | 'phone' | 'default'
    callNumber: string
    onOpen: () => void
    onClose: () => void
    setCallType: (type: 'whatsapp' | 'phone') => void
    setCallNumber: (number: string) => void
}

const useConfirmationSheet = create<DetailSheetStore>((set) => ({
    isOpen: false,
    callType: 'default',
    callNumber: '',

    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    setCallType: (type: 'whatsapp' | 'phone') => set({ callType: type }),
    setCallNumber: (number: string) => set({ callNumber: number }),
}))

export default useConfirmationSheet
