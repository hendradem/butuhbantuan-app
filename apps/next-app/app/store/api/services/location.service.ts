import config from '@/app/config'
import axios from 'axios'

const GEOCODING_URL_API = `${config.BACKEND_HOST}/directions/geocoding`
const GEOLOCATION_BASE_URL = `${config.BACKEND_HOST}/directions/geolocation`

const axiosConfig = {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
    },
}

export const getAddressLocation = async (
    locationQuery: string
): Promise<any> => {
    if (!locationQuery) {
        return null
    }

    const response = await axios.get(
        `${GEOLOCATION_BASE_URL}?searchQuery=${locationQuery}`,
        axiosConfig
    )

    const geoapifySearchResponse = response?.data?.data
    return geoapifySearchResponse
}

export const getAddressInfo = async (
    longitude: number | string,
    latitude: number | string
): Promise<any> => {
    if (!longitude || !latitude) {
        return null
    }

    try {
        const response = await axios.get(
            `${GEOCODING_URL_API}?longitude=${longitude}&latitude=${latitude}`,
            axiosConfig
        )

        const geocodingResponse = response.data.data
        return geocodingResponse?.features || null // ✅ Return null if features is undefined
    } catch (error) {
        console.error('Geocoding API error:', error)
        return null // ✅ Return null on error
    }
}
