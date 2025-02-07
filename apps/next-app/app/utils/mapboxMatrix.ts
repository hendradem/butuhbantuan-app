import config from '../config'

interface Coordinate {
    longitude: number
    latitude: number
}

interface MatrixResponse {
    code: string
    durations: number[][]
    distances: number[][]
}

export async function calculateMatrix(
    origins: Coordinate[],
    destinations: Coordinate[]
): Promise<MatrixResponse> {
    // Convert coordinates to the format required by Mapbox
    const coordinates = [...origins, ...destinations]
        .map((coord) => `${coord.longitude},${coord.latitude}`)
        .join(';')

    // Calculate the number of sources (origins) and destinations
    const sources = origins.map((_, index) => index).join(';')
    const dests = destinations
        .map((_, index) => index + origins.length)
        .join(';')

    const cfg = config.MAPBOX_URL

    // Construct the Matrix API URL
    const url =
        `${config.MAPBOX_URL}/directions-matrix/v1/mapbox/driving/${coordinates}` +
        `?sources=${sources}&destinations=${dests}` +
        `&access_token=${config.MAPBOX_API_KEY}`

    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error('Matrix API request failed')
        }
        return await response.json()
    } catch (error) {
        console.error('Error calculating matrix:', error)
        throw error
    }
}

// Example function to find the nearest destination for each origin
export function findNearestDestinations(
    matrixResponse: MatrixResponse
): number[] {
    return matrixResponse.durations.map((originDurations) => {
        const minDuration = Math.min(
            ...originDurations.filter((d) => d !== null)
        )
        return originDurations.indexOf(minDuration)
    })
}
