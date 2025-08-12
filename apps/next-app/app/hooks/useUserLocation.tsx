import { useState } from 'react'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getAddressInfo } from '@/store/api/services/location.service'

type Coordinates = { lat: number; long: number }

export const useCurrentLocation = (
    updateCoordinate: (lat: number, lng: number) => void
) => {
    const [currentUserAddress, setCurrentUserAddress] = useState<string>('')

    const handleGetCurrentLocation = async (e?: React.SyntheticEvent) => {
        e?.preventDefault()

        getCurrentLocation(async (location: any) => {
            const coordinates: Coordinates = {
                lat: location.lat,
                long: location.lng,
            }

            updateCoordinate(coordinates.lat, coordinates.long)

            try {
                const res = await getAddressInfo(
                    coordinates.long,
                    coordinates.lat
                )
                const address = res[0]?.place_name || ''
                setCurrentUserAddress(address)
            } catch (error) {
                console.error('Failed to get address info:', error)
            }
        })
    }

    return {
        handleGetCurrentLocation,
        currentUserAddress,
    }
}
