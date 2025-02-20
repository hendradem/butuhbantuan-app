import { create } from 'zustand'

interface State {
    lat: number
    long: number
    subdistrict: string
    regency: string
    province: string
    fullAddress: string
    isRebuildMap: boolean
    isRefetchMatrix: boolean
}

type Action = {
    updateLat: (lat: State['lat']) => void
    updateLong: (long: State['long']) => void
    updateCoordinate: (lat: State['lat'], long: State['long']) => void
    updateSubdistrict: (subdistrict: State['subdistrict']) => void
    updateRegency: (regency: State['regency']) => void
    updateProvince: (province: State['province']) => void
    updateFullAddress: (fullAddress: State['fullAddress']) => void
    updateRebuildMap: (isRebuildMap: boolean) => void
    updateRefetchMatrix: () => void
}

const useUserLocationData = create<State & Action>()((set) => ({
    lat: 0,
    long: 0,
    subdistrict: 'null',
    regency: 'null',
    province: 'null',
    fullAddress: 'null',
    isRebuildMap: false,
    isRefetchMatrix: false,

    updateLat: (lat: number) => {
        set(() => ({ lat: lat }))
    },
    updateLong: (long: number) => {
        set(() => ({ long: long }))
    },
    updateCoordinate: (lat: number, long: number) => {
        set(() => ({ lat: lat, long: long }))
    },
    updateSubdistrict: (subdistrict: string) => {
        set(() => ({ subdistrict: subdistrict }))
    },
    updateRegency: (regency: string) => {
        set(() => ({ regency: regency }))
    },
    updateProvince: (province: string) => {
        set(() => ({ province: province }))
    },
    updateFullAddress: (fullAddress: string) => {
        set(() => ({ fullAddress: fullAddress }))
    },
    updateRebuildMap: (status: boolean) => {
        set(() => ({ isRebuildMap: status }))
    },
    updateRefetchMatrix: () => {
        set((state) => ({ isRefetchMatrix: !state.isRefetchMatrix }))
    },
}))

export default useUserLocationData
