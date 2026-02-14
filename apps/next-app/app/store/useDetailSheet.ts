import { create } from 'zustand'

interface DetailData {
    emergencyType: any
    emergency: any
}

interface DetailSheetStore {
    isOpen: boolean
    isFullScreen: boolean
    detailSheetData: DetailData | null
    onOpen: () => void
    onClose: () => void
    onFullScreen: () => void
    onExitFullScreen: () => void
    setDetailSheetData: (data: DetailData) => void
}

const useDetailSheet = create<DetailSheetStore>((set) => ({
    isOpen: false,
    isFullScreen: false,
    detailSheetData: null,

    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onFullScreen: () => set({ isFullScreen: true }),
    onExitFullScreen: () => set({ isFullScreen: false }),
    setDetailSheetData: (data: DetailData) => set({ detailSheetData: data }),
}))

export default useDetailSheet
