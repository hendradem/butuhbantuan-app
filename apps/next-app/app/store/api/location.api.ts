import { useQuery } from '@tanstack/react-query'
import { getAddressLocation, getAddressInfo } from './services/location.service'

export const useAddressLocation = (locationQuery: string) => {
    return useQuery(
        ['addressLocation'],
        () => getAddressLocation(locationQuery),
        {
            enabled: false,
        }
    )
}

export const useAddressInformation = (
    longitude: number | string,
    latitude: number | string
) => {
    return useQuery(
        ['addressInformation'],
        () => getAddressInfo(longitude, latitude) as Promise<any>,
        {
            enabled: false,
        }
    )
}
