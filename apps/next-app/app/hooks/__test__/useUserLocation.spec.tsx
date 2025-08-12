// __tests__/useUserLocation.test.tsx

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useCurrentLocation } from '../useUserLocation'
import * as locationUtils from '@/utils/getCurrentLocation'
import * as locationService from '@/store/api/services/location.service'

jest.mock('../../utils/getCurrentLocation', () => ({
    getCurrentLocation: jest.fn(),
}))

jest.mock('../../store/api/services/location.service', () => ({
    getAddressInfo: jest.fn(),
}))

describe('useCurrentLocation (Jest)', () => {
    const mockUpdateCoordinate = jest.fn()

    const TestComponent = () => {
        const { currentUserAddress, handleGetCurrentLocation } =
            useCurrentLocation(mockUpdateCoordinate)

        return (
            <div>
                <div data-testid="address">{currentUserAddress}</div>
                <button onClick={handleGetCurrentLocation}>Get Location</button>
            </div>
        )
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should initialize with empty currentUserAddress', () => {
        render(<TestComponent />)
        const address = screen.getByTestId('address')
        expect(address.textContent).toBe('')
    })

    it('should get current location and update address', async () => {
        const mockLat = 1.23
        const mockLng = 4.56

        ;(locationUtils.getCurrentLocation as jest.Mock).mockImplementation(
            (cb) => {
                cb({ lat: mockLat, lng: mockLng })
            }
        )
        ;(locationService.getAddressInfo as jest.Mock).mockResolvedValue([
            { place_name: 'Mocked Address' },
        ])

        render(<TestComponent />)

        fireEvent.click(screen.getByText('Get Location'))

        await waitFor(() => {
            expect(mockUpdateCoordinate).toHaveBeenCalledWith(mockLat, mockLng)
            expect(screen.getByTestId('address').textContent).toBe(
                'Mocked Address'
            )
        })
    })

    it('should handle error when getAddressInfo fails', async () => {
        ;(locationUtils.getCurrentLocation as jest.Mock).mockImplementation(
            (cb) => {
                cb({ lat: 1.11, lng: 2.22 })
            }
        )

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {})

        ;(locationService.getAddressInfo as jest.Mock).mockRejectedValue(
            new Error('API error')
        )

        render(<TestComponent />)
        fireEvent.click(screen.getByText('Get Location'))

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to get address info:',
                expect.any(Error)
            )
        })

        consoleErrorSpy.mockRestore()
    })
})
