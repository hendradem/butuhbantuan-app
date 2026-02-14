import axios from 'axios'
import config from '@/config'

const GEOCODING_URL_API = `${config.BACKEND_HOST}/geocoding`

const axiosConfig = {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
    },
}

export const reverseGeocoding = async (
    longitude: number | string,
    latitude: number | string
): Promise<any> => {
    if (!longitude || !latitude) {
        return null
    }

    const response = await axios.get(
        `${GEOCODING_URL_API}/reverse/?longitude=${longitude}&latitude=${latitude}`,
        axiosConfig
    )

    const geocodingResponse = response.data.data
    return geocodingResponse || null // ✅ Return null if features is undefined
}

export const getEmergencyWithTripEstimates = async (
    userCoords: [number, number],
    emergencies: any
): Promise<any> => {
    if (!userCoords || !emergencies) {
        return null
    }

    const requestBody = {
        userCoordinates: userCoords, // current user coordinates
        emergencyIDs: emergencies.map((e: any) => e.id), // emergency ids
    }

    const response = await axios.post(
        `${GEOCODING_URL_API}/emergency/trip`,
        requestBody,
        axiosConfig
    )

    const tripDataResponse = response.data.data
    const sortedData = tripDataResponse.sort(
        (a: any, b: any) => a.trip.duration - b.trip.duration
    )
    return sortedData
}
