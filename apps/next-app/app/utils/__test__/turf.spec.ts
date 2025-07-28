import {
    getNearestData,
    getAllTripEstimations,
    getNearestDataWithEstimation,
} from '../turf'

const mockEmergencyData = [
    {
        id: 1,
        name: 'Emergency A',
        coordinates: ['107.6100', '-6.9000'], // Bandung
    },
    {
        id: 2,
        name: 'Emergency B',
        coordinates: ['106.8000', '-6.2000'], // Jakarta
    },
]

const userLocation: [number, number] = [107.61, -6.9] // Bandung

describe('getNearestData', () => {
    it('returns only emergencies within 10km radius', () => {
        const result = getNearestData(mockEmergencyData, userLocation)
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('Emergency A')
    })
})

describe('getAllTripEstimations', () => {
    it('returns trip estimations for all emergency data', () => {
        const result = getAllTripEstimations(mockEmergencyData, userLocation)
        expect(result.length).toBe(2)
        result.forEach((item) => {
            expect(item.trip).toHaveProperty('distance')
            expect(item.trip).toHaveProperty('duration')
            expect(item.trip.distance).toBeGreaterThanOrEqual(0)
            expect(item.trip.duration).toBeGreaterThanOrEqual(0)
        })
    })
})

describe('getNearestDataWithEstimation', () => {
    it('returns only nearby emergencies with trip estimations', () => {
        const result = getNearestDataWithEstimation(
            mockEmergencyData,
            userLocation
        )
        expect(result.length).toBe(1)
        expect(result[0].emergencyData.name).toBe('Emergency A')
        expect(result[0].trip).toHaveProperty('distance')
        expect(result[0].trip).toHaveProperty('duration')
    })
})
