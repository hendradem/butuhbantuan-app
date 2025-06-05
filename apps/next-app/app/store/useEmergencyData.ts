import { create } from 'zustand'
import { EmergencyDataType } from '../types/emergency'
import { useEmergencyApi } from '@/app/store/api/emergency.api'

type SelectedEmergencyDataType = {
    selectedEmergencyData: EmergencyDataType
    selectedEmergencyType?: any
    selectedEmergencySource: 'map' | 'detail'
}

type State = {
    emergencyData: EmergencyDataType[]
    selectedEmergencyData: SelectedEmergencyDataType
}

type Actions = {
    updateEmergencyData: (data: EmergencyDataType[]) => void
    updateSelectedEmergencyData: (data: SelectedEmergencyDataType) => void
}

const useEmergencyData = create<State & Actions>((set) => ({
    emergencyData: [],
    selectedEmergencyData: {
        // selectedEmergencyData: {} as EmergencyDataType,
        // selectedEmergencyType: null,
        // selectedEmergencySource: "map",
    },
    updateEmergencyData: (data) => set({ emergencyData: data }),
    updateSelectedEmergencyData: (data) => set({ selectedEmergencyData: data }),
}))

export default useEmergencyData
