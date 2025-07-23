import { emergencyService } from './services/emergency.service'
import { toast } from 'react-hot-toast'
import { getNearestDataWithEstimation } from '@/utils/turf'
import useEmergency from '../useEmergency'
import useUserLocationData from '../useUserLocationData'
import { getAllTripEstimations } from '@/utils/turf'
import { reverseGeocoding } from './services/geocoding.service'
import { availableCityService } from './services/availablecity.service'
import { resolveRegionFromCoords } from '@/utils/geocoding'

export const getEmergencyData = async ([lat, lng]: any) => {
    const { setFilteredEmergency } = useEmergency.getState()

    try {
        const toastId = toast.loading('Mencari layanan...')
        const regionData = await resolveRegionFromCoords(lat, lng)

        if (regionData) {
            const response = await emergencyService.getByProvince(
                regionData?.provinceID
            )
            const emergencyList = response.data
            const userLocation: [number, number] = [lng, lat] // turf.js uses [lng, lat]
            const calculatedData = await getNearestDataWithEstimation(
                emergencyList,
                userLocation
            )

            toast.success(`Layanan tersedia di ${regionData?.regionName}`, {
                id: toastId,
                duration: 500,
            })

            console.log('nearest emergency data', calculatedData)
            setFilteredEmergency(calculatedData)

            if (calculatedData.length == 0) {
                console.log('datanya kosong')
                setFilteredEmergency([])
                getEmergencyDispatcher()
            }

            return calculatedData
        } else {
            toast.error(`Layanan belum tersedia`, {
                id: toastId,
                duration: 400,
            })
            setFilteredEmergency([])
            return null
        }
    } catch (error) {
        console.error('Error fetching emergency data:', error)
        toast.error('Gagal mengambil data')
        return null
    }
}

export const getEmergencyDispatcher = async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

    const { setFilteredEmergency } = useEmergency.getState()
    try {
        const {
            currentRegion: {
                regency: { id: regencyID } = {},
                province: { id: provinceID = '' } = {},
            },
            long: userLong,
            lat: userLat,
        } = useUserLocationData.getState()

        if (!regencyID || !userLat || !userLong) {
            throw new Error('Lokasi pengguna belum lengkap')
        }

        const res = await emergencyService.getDispatcher(regencyID, provinceID)
        const calculatedData = await getAllTripEstimations(res.data, [
            userLong,
            userLat,
        ])

        setFilteredEmergency(calculatedData)
    } catch (err) {
        console.error('Gagal memuat dispatcher:', err)
        toast.error('Gagal memuat dispatcher')
    }
}
