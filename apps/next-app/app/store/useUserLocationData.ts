import { create } from 'zustand'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getAddressInfo } from './api/services/location.service'

type Region = {
    id: string
    name: string
}

interface State {
    lat: number
    long: number
    fullAddress: string
    isRefetchMatrix: boolean
    isGetCurrentLocation: boolean
    currentRegion: {
        regency: Region
        province?: Region
    }
}

type Action = {
    updateCoordinate: (lat: State['lat'], long: State['long']) => void
    updateFullAddress: (fullAddress: State['fullAddress']) => void
    updateRefetchMatrix: () => void
    updateIsGetCurrentLocation: (
        isGetCurrentLocation: State['isGetCurrentLocation']
    ) => void
    setCurrentRegion: (region: { regency: Region; province: Region }) => void
}

const useUserLocationData = create<State & Action>()((set) => ({
    lat: 0,
    long: 0,
    fullAddress: '',
    isRefetchMatrix: false,
    isGetCurrentLocation: false,
    currentRegion: {
        regency: { id: '', name: '' },
        province: { id: '', name: '' },
    },

    updateCoordinate: (lat: number, long: number) => {
        set(() => ({ lat: lat, long: long }))
    },
    updateFullAddress: (fullAddress: string) => {
        set(() => ({ fullAddress: fullAddress }))
    },
    updateRefetchMatrix: () => {
        set((state) => ({ isRefetchMatrix: !state.isRefetchMatrix }))
    },
    updateIsGetCurrentLocation: (isGetCurrentLocation: boolean) => {
        set(() => ({ isGetCurrentLocation: isGetCurrentLocation }))
    },
    setCurrentRegion: (region) => set({ currentRegion: region }),
}))

export default useUserLocationData
