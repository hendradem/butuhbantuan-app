import config from '../config'
import { fetcher } from '../libs/fetcher'

export interface Location {
    id: string
    name: string
    coordinates: [number, number]
    address?: string
}

export const getDirectionsRoute = async (
    origin: [number, number],
    destination: [number, number]
) => {
    const url = `${config.MAPBOX_URL}/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${config.MAPBOX_API_KEY}`

    try {
        const data = await fetcher(url)
        return data.routes[0].geometry.coordinates
    } catch (error) {
        console.error('Error fetching route path:', error)
        throw error
    }
}

export const getDistanceMatrix = async (
    origin: [number, number],
    destinations: any[]
): Promise<any> => {
    const coordinates = [
        origin,
        ...destinations.map((dest) => dest.coordinates),
    ]
        .map((coord) => coord.join(','))
        .join(';')

    const url = `${config.MAPBOX_URL}/directions-matrix/v1/mapbox/driving/${coordinates}?access_token=${config.MAPBOX_API_KEY}&annotations=distance,duration`

    try {
        const data = await fetcher(url)
        if (data.code !== 'Ok') {
            throw new Error('Failed to get distance matrix')
        }

        // First row contains durations from origin to all destinations
        const durations = data.durations[0].slice(1) // Skip first element (distance to self)
        const distances = data.distances[0].slice(1)

        destinations.forEach((location, index) => {
            location.responseTime = {
                duration: formatTheTime(durations[index]),
                distance: formatDistance(distances[index]),
            }
        })

        return destinations
            .filter(
                ({ responseTime }) =>
                    Math.floor(parseInt(responseTime.duration)) <= 30
            )
            .sort((a, b) => a.responseTime.duration - b.responseTime.duration)
            .map((location, index) => ({
                ...location,
                matrix: {
                    duration: formatTheTime(durations[index]),
                    distance: formatDistance(distances[index]),
                },
            })) 
    } catch (error) {
        console.error('Error fetching distance matrix:', error)
        throw error
    }
}

const formatDistance = (distance: any): string => {
    const fixed = (distance / 1000).toFixed(2)
    return fixed
}

const formatTheTime = (time: any): string => {
    const fixed = (time / 60).toFixed(2)
    return fixed
}
