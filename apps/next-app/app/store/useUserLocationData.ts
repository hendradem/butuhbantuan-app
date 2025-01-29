import { create } from 'zustand'

type State = {
    lat: number
    long: number
    regionalData: {
        subdistrict: string
        regency: string
        province: string
    }
}

type Action = {
    updateLat: (lat: State['lat']) => void
    updateLong: (long: State['long']) => void
    updateUserCoordinate: (coordinate: CoordinateType) => void
    updateRegionalData: (regionalData: State['regionalData']) => void
}
interface CoordinateType {
    long: number
    lat: number
}

const useUserLocationData = create<State & Action>()((set) => ({
    lat: 0,
    long: 0,
    regionalData: {
        subdistrict: 'null',
        regency: 'null',
        province: 'null',
    },
    updateLat: (lat: number) => {
        set(() => ({ lat: lat }))
    },
    updateLong: (long: number) => {
        set(() => ({ long: long }))
    },
    updateUserCoordinate: (coordinate: CoordinateType): void => {
        set(() => ({
            long: coordinate.long,
            lat: coordinate.lat,
        }))
    },

    updateRegionalData: (regionalData) => {
        set(() => ({ regionalData: regionalData }))
        localStorage.setItem('subdisctrict', regionalData.subdistrict)
        localStorage.setItem('regency', regionalData.regency)
        localStorage.setItem('province', regionalData.province)
    },
}))

export default useUserLocationData
