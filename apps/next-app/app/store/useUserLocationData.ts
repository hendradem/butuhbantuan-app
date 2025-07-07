import { create } from 'zustand'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getAddressInfo } from './api/services/location.service'

interface State {
    lat: number
    long: number
    fullAddress: string
    isRefetchMatrix: boolean
}

type Action = {
    updateCoordinate: (lat: State['lat'], long: State['long']) => void
    updateFullAddress: (fullAddress: State['fullAddress']) => void
    updateRefetchMatrix: () => void
    getAndSetCurrentLocation: () => void
}

const useUserLocationData = create<State & Action>()((set) => ({
    lat: 0,
    long: 0,
    fullAddress: '',
    isRefetchMatrix: false,

    updateCoordinate: (lat: number, long: number) => {
        set(() => ({ lat: lat, long: long }))
    },
    updateFullAddress: (fullAddress: string) => {
        set(() => ({ fullAddress: fullAddress }))
    },
    updateRefetchMatrix: () => {
        set((state) => ({ isRefetchMatrix: !state.isRefetchMatrix }))
    },
    getAndSetCurrentLocation: () => {
        getCurrentLocation(async (location: any) => {
            const lat = location.lat
            const long = location.lng

            set(() => ({ lat, long }))

            try {
                const res = await getAddressInfo(long, lat)
                const address = res[0]?.place_name || ''
                set(() => ({ fullAddress: address }))
            } catch (err) {
                console.error('Error getting address info:', err)
            }
        })
    },
}))

export default useUserLocationData
