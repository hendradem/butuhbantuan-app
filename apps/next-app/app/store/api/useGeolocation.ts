import config from '@/app/config'
import { fetcher } from '@/app/libs/fetcher'
const useGeolocation = () => {
    const getLocation = async (locationQuery: string) => {
        if (locationQuery === '') {
            return
        }
        const requestUrl: string = `${config.GEOLOCATION_BASE_URL}/autocomplete?text=${locationQuery}&apiKey=${config.GEOAPIFY_API_KEY}`
        const response = await fetcher(requestUrl)
        return response
    }

    const getAddressInfo = async (longitude: number, latitude: number) => {
        const requestUrl: string = `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.MAPBOX_API_KEY}`
        const response = await fetcher(requestUrl)
        return response
    }

    return { getLocation, getAddressInfo }
}

export default useGeolocation
