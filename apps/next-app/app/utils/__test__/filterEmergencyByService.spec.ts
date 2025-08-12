// __tests__/filterEmergencyByService.spec.ts
import { filterEmergencyByService } from '../filterEmergencyByService'
import useEmergency from '@/store/useEmergency'

jest.mock('../../store/useEmergency', () => ({
    __esModule: true,
    default: {
        getState: jest.fn(),
    },
}))

describe('filterEmergencyByService', () => {
    const mockEmergencyData = [
        {
            emergencyData: {
                emergency_type: { name: 'ambulance' },
            },
        },
        {
            emergencyData: {
                emergency_type: { name: 'fire' },
            },
        },
        {
            emergencyData: {
                emergency_type: { name: 'ambulance' },
            },
        },
    ]

    beforeEach(() => {
        ;(useEmergency.getState as jest.Mock).mockReturnValue({
            filteredEmergency: mockEmergencyData,
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should return emergencies matching the service name', () => {
        const result = filterEmergencyByService('ambulance')
        expect(result).toHaveLength(2)
        expect(
            result.every(
                (e) => e.emergencyData.emergency_type.name === 'ambulance'
            )
        ).toBe(true)
    })

    it('should return empty array if no match found', () => {
        const result = filterEmergencyByService('police')
        expect(result).toEqual([])
    })
})
