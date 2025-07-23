import { create } from 'zustand'
interface DetailSheetStore {
    filteredEmergency: []
    selectedEmergency: any
    setFilteredEmergency: (data: any) => void
    setSelectedEmergency: (data: any) => void
}

const useEmergency = create<DetailSheetStore>((set) => ({
    filteredEmergency: [],
    selectedEmergency: null,
    setFilteredEmergency: (data) => set({ filteredEmergency: data }),
    setSelectedEmergency: (data) => set({ selectedEmergency: data }),
}))

export default useEmergency
