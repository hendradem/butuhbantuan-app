import { getCurrentLocation } from '@/utils/getCurrentLocation'
import useUserLocationData from '@/store/useUserLocationData'

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
            return { data: { lat: 0, long: 0 }, error: location.error }
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
