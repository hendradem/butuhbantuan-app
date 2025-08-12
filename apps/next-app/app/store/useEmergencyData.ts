<<<<<<< HEAD
import { create } from "zustand";
import { EmergencyDataType } from "../types/emergency";
import { useEmergencyApi } from "@/app/store/api/emergency.api";

type SelectedEmergencyDataType = {
  selectedEmergencyData: EmergencyDataType;
  selectedEmergencyType?: any;
  selectedEmergencySource: "map" | "detail";
};

type State = {
  emergencyData: EmergencyDataType[];
  selectedEmergencyData: SelectedEmergencyDataType;
};

type Actions = {
  updateEmergencyData: (data: EmergencyDataType[]) => void;
  updateSelectedEmergencyData: (data: SelectedEmergencyDataType) => void;
};

const useEmergencyData = create<State & Actions>((set) => ({
  emergencyData: [],
  selectedEmergencyData: {
    // selectedEmergencyData: {} as EmergencyDataType,
    // selectedEmergencyType: null,
    // selectedEmergencySource: "map",
  },
  updateEmergencyData: (data) => set({ emergencyData: data }),
  updateSelectedEmergencyData: (data) => set({ selectedEmergencyData: data }),
}));

export default useEmergencyData;
=======
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
>>>>>>> 6b922f49fc712b0ac112b37d3528c7afe5dd39e0
