import { create } from 'zustand'

interface SheetData {
    emergencyType: any
    emergency: any
}

interface ExploreSheetStore {
    isOpen: boolean
    isFullScreen: boolean
    sheetData: SheetData | null
    snapPoint: number

    onOpen: () => void
    onClose: () => void
    onFullScreen: () => void
    onExitFullScreen: () => void
    setSheetData: (data: SheetData) => void
    onSnap: (snapPoint: number) => void
}

const useExploreSheet = create<ExploreSheetStore>((set) => ({
    isOpen: false,
    isFullScreen: false,
    sheetData: null,
    snapPoint: 1,

    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
    onFullScreen: () => set({ isFullScreen: true }),
    onExitFullScreen: () => set({ isFullScreen: false }),
    setSheetData: (data: SheetData) => set({ sheetData: data }),
    onSnap: (snapPoint: number) => set({ snapPoint }),
}))

export default useExploreSheet
