import { getCurrentLocation } from '@/utils/getCurrentLocation'
import useUserLocationData from '@/store/useUserLocationData'
import useErrorSheet from '@/store/useErrorSheet'
import useLeaflet from '@/store/useLeaflet'
import toast from 'react-hot-toast'
import { reverseGeocoding } from '@/store/api/services/geocoding.service'
import { availableCityService } from '@/store/api/services/availablecity.service'

const { setMapZoom } = useLeaflet.getState()

const { updateFullAddress, updateCoordinate, setCurrentRegion } =
    useUserLocationData.getState()

type userLocationReturnType = {
    data: { lat: number; long: number }
    error?: string
}

export const getUserLocation = async (): Promise<
    userLocationReturnType | undefined
> => {
    try {
        const location = await new Promise<{
            lat: number
            lng: number
            error?: string
        }>((resolve) => getCurrentLocation(resolve))

        if (location.error) {
            setMapZoom(5)
            useErrorSheet.getState().setErrorMessage(location.error)
            useErrorSheet.getState().onOpen()

            return {
                data: { lat: -7.1800242, long: 110.0217818 }, // default location
                error: location.error,
            }
        }

        // update global state
        useUserLocationData
            .getState()
            .updateCoordinate(location.lat, location.lng)

        return {
            data: { lat: location.lat, long: location.lng },
            error: 'null',
        }
    } catch (error) {
        console.error('Failed to fetch location/address info', error)
    }
}

export const resolveRegionFromCoords = async (
    lat: number,
    lng: number
): Promise<{
    regionName: string
    fullAddress: string
    regencyID: string
    provinceID: string
    provinceName: string
    data: any // full API response (optional)
} | null> => {
    try {
        const geoRes = await reverseGeocoding(lng, lat)
        const regionName = geoRes?.address?.county || geoRes?.address?.city
        const fullAddress = geoRes?.display_name

        const regionRes = await availableCityService.getByName(regionName)
        const city = regionRes.data?.[0]

        updateFullAddress(fullAddress)
        updateCoordinate(lat, lng)
        setCurrentRegion({
            regency: { id: city.regency_id, name: city.name },
            province: {
                id: city.regency.Province.id,
                name: city.regency.Province.name,
            },
        })

        return {
            regionName,
            fullAddress,
            regencyID: city.regency_id,
            provinceID: city.regency.Province.id,
            provinceName: city.regency.Province.name,
            data: city,
        }
    } catch (error) {
        console.log('resolveRegionFromCoords error:', error)
        return null
    }
}
