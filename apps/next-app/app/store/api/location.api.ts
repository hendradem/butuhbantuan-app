import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/app/libs/fetcher'
import config from '@/app/config'

export const getAddressLocation = async (locationQuery: string) : Promise<any> => {
    const response = await fetcher(
        `${config.GEOLOCATION_BASE_URL}/autocomplete?text=${locationQuery}&apiKey=${config.GEOAPIFY_API_KEY}`
    )  
    return response
}

export const getAddressInfo = async (longitude: number | string, latitude: number | string) : Promise<any> => { 
    const response = await fetcher(
        `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.MAPBOX_API_KEY}`
    )  
    return response?.features
}

export const useAddressLocation = (locationQuery: string) => {
    return useQuery(['addressLocation'], () => getAddressLocation(locationQuery), {
        enabled: false,
    })
}

export const useAddressInformation = (longitude: number | string, latitude: number | string) => {
    return useQuery(['addressInformation'], () => getAddressInfo(longitude, latitude) as Promise<any>, {
        enabled: false,
    })
}
 
