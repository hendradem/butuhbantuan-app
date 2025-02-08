import config from '../config'

export interface Location {
    id: string
    name: string
    coordinates: [number, number]
    address?: string
}

interface MatrixAPIResponse {
    code: string
    durations: number[][]
    destinations: { distance: number; name: string }[]
    sources: { distance: number; name: string }[]
}

export const getDistanceMatrix = async (
    origin: [number, number],
    destinations: Location[]
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
        // const distances = data.distances[0].slice(1)

        return destinations.map((location, index) => ({
            location,
            duration: formatTheTime(durations[index]),
            distance: formatTheDistance(data.distances),
        }))
    } catch (error) {
        console.error('Error fetching distance matrix:', error)
        throw error
    }
}

const formatTheDistance = (distances: any): any => {
    // const convertToKm = (meters: any) => (meters / 1000).toFixed(2)
    const distancesInKm = distances.map((row: number[]) => {
        return row.map((distance) => console.log(distance))
    })
    return distancesInKm
}

const formatTheTime = (time: any): string => {
    const fixed = (time / 60).toFixed(2)
    return fixed
}

export const formatDuration = (minutes: number): string => {
    if (minutes < 1) {
        return 'Less than a minute'
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)

    if (hours === 0) {
        return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
    }

    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
}
