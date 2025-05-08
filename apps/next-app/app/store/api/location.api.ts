import useSwr from 'swr'
import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/app/libs/fetcher'
import config from '@/app/config'

export const getAddressLocation = async (
    locationQuery: string
): Promise<any> => {
    const mapboxSearchResponse = await fetcher(
        `${config.MAPBOX_URL}/search/searchbox/v1/suggest?q=${locationQuery}&access_token=${config.MAPBOX_API_KEY}&session_token=a9145973-c663-4d97-9673-213e22be003f&language=en&limit=10&types=country%2Cregion%2Cdistrict%2Cpostcode%2Clocality%2Cplace%2Cneighborhood%2Caddress%2Cpoi%2Cstreet%2Ccategory%2C`
    )
    const geoapifySearchResponse = await fetcher(
        `${config.GEOLOCATION_BASE_URL}/autocomplete?text=${locationQuery}&apiKey=${config.GEOAPIFY_API_KEY}`
    )
    return geoapifySearchResponse
}

export const getAddressInfo = async (
    longitude: number | string,
    latitude: number | string
): Promise<any> => {
    const response = await fetcher(
        `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.MAPBOX_API_KEY}`
    )
    return response?.features
}

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

export const useAddressInformationWithSwr = (
    longitude: number | string,
    latitude: number | string
) => {
    return useSwr(
        `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.MAPBOX_API_KEY}`,
        fetcher
    )
}
