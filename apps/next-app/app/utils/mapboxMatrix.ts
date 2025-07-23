import config from '../config'
import axios from 'axios'

export interface Location {
    id: string
    name: string
    coordinates: [number, number]
    address?: string
}

const DIRECTIONS_URL_API = `${config.BACKEND_HOST}/directions`
const MATRIX_URL_API = `${config.BACKEND_HOST}/directions/matrix`

export const getDirectionsRoute = async (
    origin: [number, number],
    destination: [number, number]
) => {
    const response = await axios.get(
        `${DIRECTIONS_URL_API}?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}`
    )

    return response?.data?.data
}

export const getDistanceMatrix = async (
    origin: [number, number],
    destinations: any[]
    // isServiceAvailable: boolean
): Promise<any[]> => {
    // if (!isServiceAvailable) return []

    try {
        // Validate inputs
        if (!origin || !Array.isArray(origin) || origin.length !== 2) {
            console.error('Invalid origin coordinates:', origin)
            return []
        }

        if (
            !destinations ||
            !Array.isArray(destinations) ||
            destinations.length === 0
        ) {
            console.error('Invalid destinations:', destinations)
            return []
        }

        // Safely build coordinates array
        const destinationCoords = destinations
            .filter(
                (dest) => dest?.coordinates && Array.isArray(dest.coordinates)
            )
            .map((dest) => dest.coordinates)

        if (destinationCoords.length === 0) {
            console.error('No valid destination coordinates found')
            return []
        }

        const coordinates = [origin, ...destinationCoords]
            .map((coord) => {
                if (!Array.isArray(coord) || coord.length !== 2) {
                    console.error('Invalid coordinate:', coord)
                    return null
                }
                return coord.join(',')
            })
            .filter((coord) => coord !== null) // Remove invalid coordinates
            .join(';')

        if (!coordinates) {
            console.error('No valid coordinates to process')
            return []
        }

        const response = await axios.get(
            `${MATRIX_URL_API}?coordinates=${coordinates}`
        )

        const matrixResponse = response.data?.data

        // Validate API response structure
        if (
            !matrixResponse ||
            !Array.isArray(matrixResponse.durations) ||
            !Array.isArray(matrixResponse.distances)
        ) {
            console.error('Invalid matrix response structure:', matrixResponse)
            return []
        }

        // Check if we have data for the first row (origin)
        if (!matrixResponse.durations[0] || !matrixResponse.distances[0]) {
            console.error('Missing duration/distance data for origin')
            return []
        }

        // First row contains durations from origin to all destinations
        const durations = matrixResponse.durations[0].slice(1) // Skip first element (distance to self)
        const distances = matrixResponse.distances[0].slice(1)

        // Validate that we have matching data
        if (
            durations.length !== distances.length ||
            durations.length !== destinations.length
        ) {
            console.error(
                'Mismatch between API response and destinations count'
            )
            return []
        }

        // Add response time to each destination
        const destinationsWithTime = destinations.map((location, index) => {
            if (index >= durations.length || index >= distances.length) {
                return {
                    ...location,
                    responseTime: {
                        duration: 'N/A',
                        distance: 'N/A',
                    },
                }
            }

            return {
                ...location,
                responseTime: {
                    duration: formatTheTime(durations[index]),
                    distance: formatDistance(distances[index]),
                },
            }
        })

        // Filter and sort destinations
        return destinationsWithTime
            .filter(({ responseTime }) => {
                const durationValue = parseInt(responseTime.duration)
                return !isNaN(durationValue) && Math.floor(durationValue) <= 30
            })
            .sort((a, b) => {
                const durationA = parseInt(a.responseTime.duration) || Infinity
                const durationB = parseInt(b.responseTime.duration) || Infinity
                return durationA - durationB
            })

        // Filter and sort destinations
        // return destinationsWithTime
        //     .filter(({ responseTime, is_dispatcher }) => {
        //         const durationValue = parseInt(responseTime.duration)

        //         // Always include if dispatcher
        //         if (is_dispatcher === true) return true

        //         // Otherwise include if duration is a number and <= 30
        //         return !isNaN(durationValue) && Math.floor(durationValue) <= 60
        //     })
        //     .sort((a, b) => {
        //         const durationA = parseInt(a.responseTime.duration)
        //         const durationB = parseInt(b.responseTime.duration)

        //         // Ensure dispatcher with valid duration is sorted correctly
        //         const valueA = !isNaN(durationA)
        //             ? durationA
        //             : a.is_dispatcher
        //               ? 9999
        //               : Infinity
        //         const valueB = !isNaN(durationB)
        //             ? durationB
        //             : b.is_dispatcher
        //               ? 9999
        //               : Infinity

        //         return valueA - valueB
        //     })
    } catch (error) {
        console.error('Error fetching distance matrix:', error)
        return [] // Return empty array instead of throwing
    }
}

const formatDistance = (distance: number) => {
    const fixed = Math.floor(distance / 1000)
    return parseFloat(fixed.toFixed(2))
}

const formatTheTime = (time: number) => {
    const fixed = Math.floor(time / 60)
    return parseFloat(fixed.toFixed(2))
}
