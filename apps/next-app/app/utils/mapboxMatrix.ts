import config from '../config'

export interface Location {
    id: string
    name: string
    coordinates: [number, number]
    address?: string
}

export const getDistanceMatrix = async (
    origin: [number, number],
    destinations: any[]
) => {
    const coordinates = [
        origin,
        ...destinations.map((dest) => dest.coordinates),
    ]
        .map((coord) => coord.join(','))
        .join(';')

    // const coordinates = [origin, ...destinations]
    //     .map((coord) => `${coord.lng},${coord.lat}`)
    //     .join(';')

    const url = `${config.MAPBOX_URL}/directions-matrix/v1/mapbox/driving/${coordinates}?access_token=${config.MAPBOX_API_KEY}&annotations=distance,duration`

    try {
        const response = await fetch(url)
        const data = await response.json()

        if (data.code !== 'Ok') {
            throw new Error('Failed to get distance matrix')
        }

        // First row contains durations from origin to all destinations
        const durations = data.durations[0].slice(1) // Skip first element (distance to self)
        const distances = data.distances[0].slice(1)

        return destinations.map((location, index) => ({
            location,
            duration: formatTheTime(durations[index]),
            distance: formatDistance(distances[index]), // data.distances,
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
