import { create } from 'zustand'
import toast from 'react-hot-toast'
import {
    getNearestDataWithEstimation,
    getAllTripEstimations,
} from '@/utils/turf'
import { emergencyService } from './api/services/emergency.service'
import { reverseGeocoding } from './api/services/geocoding.service'
import { availableCityService } from './api/services/availablecity.service'
import useUserLocationData from './useUserLocationData'

interface FilteredEmergency {
    emergencyData: any
}

interface DetailSheetStore {
    filteredEmergency: []
    selectedEmergency: any
    setFilteredEmergency: (data: any) => void
    setSelectedEmergency: (data: any) => void
    getEmergencyData: (location: [number, number]) => Promise<void>
    getEmergencyDispatcher: () => Promise<void>
    checkAndUpdateLocation: (location: [number, number]) => Promise<void>
}

const useEmergency = create<DetailSheetStore>((set) => ({
    filteredEmergency: [],
    selectedEmergency: null,
    setFilteredEmergency: (data) => set({ filteredEmergency: data }),
    setSelectedEmergency: (data) => set({ selectedEmergency: data }),

    getEmergencyData: async ([lat, lng]) => {
        try {
            const res = await emergencyService.getAll()
            const userLocation = [lng, lat] // turf.js uses [lng, lat]
            const calculatedData = await getNearestDataWithEstimation(
                res.data,
                userLocation
            )
            useEmergency.getState().setFilteredEmergency(calculatedData)
            useEmergency.getState().checkAndUpdateLocation([lat, lng])
        } catch (err) {
            console.error(err)
            toast.error('Gagal mengambil data')
        }
    },

    getEmergencyDispatcher: async () => {
        const regencyID =
            useUserLocationData.getState().currentRegion.regency?.id
        const provinceID =
            useUserLocationData.getState().currentRegion.province?.id ?? ''
        const userLong = useUserLocationData.getState().long
        const userLat = useUserLocationData.getState().lat

        try {
            const res = await emergencyService.getDispatcher(
                regencyID,
                provinceID
            )
            const calculatedData = await getAllTripEstimations(res.data, [
                userLong,
                userLat,
            ])

            useEmergency.getState().setFilteredEmergency(calculatedData)

            console.log(calculatedData)

            toast.success('Dispatcher tersedia')
        } catch (err) {
            console.error(err)
        }
    },

    checkAndUpdateLocation: async ([lat, lng]) => {
        const toastId = toast.loading('Mencari layanan...')
        try {
            const geo = await reverseGeocoding(lng, lat)
            const regionName = geo?.address?.county || geo?.address?.city
            const fullAddress = geo?.display_name

            if (!regionName) throw new Error('Tidak dapat membaca wilayah')

            const res = await availableCityService.getByName(regionName)
            const data = res.data?.[0]

            if (data) {
                useUserLocationData.getState().updateFullAddress(fullAddress)
                useUserLocationData.getState().updateCoordinate(lat, lng)
                useUserLocationData.getState().setCurrentRegion({
                    regency: { id: data.regency_id, name: data.name },
                    province: {
                        id: data.regency.Province.id,
                        name: data.regency.Province.name,
                    },
                })

                toast.success(`${data.name} tersedia`, {
                    id: toastId,
                    duration: 500,
                })
            } else {
                toast.error('Layanan belum tersedia', {
                    id: toastId,
                    duration: 500,
                })
            }
        } catch (err) {
            console.error(err)
            toast.error('Gagal membaca lokasi Anda', { id: toastId })
        }
    },
}))

export default useEmergency
