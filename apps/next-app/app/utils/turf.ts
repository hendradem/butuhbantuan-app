import { point, distance as turfDistance } from '@turf/turf'

export const getNearestData = (
    emergencyData: any[],
    userLocation: any[]
): any => {
    const maxDistanceKm = 10

    const filteredEmergencies = emergencyData.filter((e: any) => {
        const from = point(userLocation)
        const to = point([+e.coordinates[0], +e.coordinates[1]]) // Note: [lng, lat]
        const dist = turfDistance(from, to, { units: 'kilometers' })

        return dist <= maxDistanceKm
    })

    return filteredEmergencies
}

export const getAllTripEstimations = (
    emergencyData: any[],
    userLocation: [number, number]
): any[] => {
    const averageSpeedKmh = 40

    return emergencyData.map((e: any) => {
        const from = point(userLocation)
        const to = point([+e.coordinates[0], +e.coordinates[1]])
        const distanceKm = turfDistance(from, to, { units: 'kilometers' })
        const durationMinutes = (distanceKm / averageSpeedKmh) * 60

        return {
            emergencyData: e,
            trip: {
                distance: distanceKm * 1000, // in meters
                duration: durationMinutes, // in minutes
            },
        }
    })
}

export const getNearestDataWithEstimation = (
    emergencyData: any[],
    userLocation: any[]
): any[] => {
    const maxDistanceKm = 10
    const averageSpeedKmh = 40

    return emergencyData
        .map((e: any) => {
            const from = point(userLocation)
            const to = point([+e.coordinates[0], +e.coordinates[1]])

            const distanceKm = turfDistance(from, to, { units: 'kilometers' })

            // Filter early if too far
            if (distanceKm > maxDistanceKm) return null

            const durationMinutes = (distanceKm / averageSpeedKmh) * 60

            return {
                emergencyData: e,
                trip: {
                    distance: distanceKm * 1000, // in meters
                    duration: durationMinutes, // in minutes
                },
            }
        })
        .filter(Boolean) // Remove nulls
}
