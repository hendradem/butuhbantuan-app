import { create } from 'zustand'
import { EmergencyDataType } from '../types/emergency'

type SelectedEmergencyDataType = {
    selectedEmergencyData: any
    selectedEmergencyType?: any
    selectedEmergencySource: 'map' | 'detail'
}

type State = {
    emergencyData: EmergencyDataType[]
    dispatcherData: any
    selectedEmergencyData: SelectedEmergencyDataType
}

type Actions = {
    updateEmergencyData: (data: EmergencyDataType[]) => void
    updateDispatcherData: (data: any) => void
    updateSelectedEmergencyData: (data: SelectedEmergencyDataType) => void
}

const useEmergencyData = create<State & Actions>((set) => ({
    emergencyData: [],
    dispatcherData: [],
    selectedEmergencyData: {
        selectedEmergencyData: {} as any,
        selectedEmergencyType: null,
        selectedEmergencySource: 'map',
    },
    updateEmergencyData: (data) => set({ emergencyData: data }),
    updateSelectedEmergencyData: (data) => set({ selectedEmergencyData: data }),
    updateDispatcherData: (data) => set({ dispatcherData: data }),
}))

export default useEmergencyData
