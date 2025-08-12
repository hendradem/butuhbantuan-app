import React from 'react'
import { render } from '@testing-library/react'
import MapClickHandler from '../leaflet/map-click-handler'
import { useMap } from 'react-leaflet'

// Mock useMap from react-leaflet
jest.mock('react-leaflet', () => ({
    useMap: jest.fn(),
}))

describe('MapClickHandler', () => {
    it('calls onClick with correct latlng when map is clicked', () => {
        const mockOnClick = jest.fn()

        // Create a mock map object with .on and .off
        const mockMap = {
            on: jest.fn(),
            off: jest.fn(),
        }

        // Mock the useMap hook
        ;(useMap as jest.Mock).mockReturnValue(mockMap)

        render(<MapClickHandler onClick={mockOnClick} />)

        // Get the callback passed to map.on
        const handleClick = (mockMap.on as jest.Mock).mock.calls[0][1]

        // Simulate a click event with latlng
        const fakeEvent = {
            latlng: { lat: -6.2, lng: 106.8 },
        }

        handleClick(fakeEvent)

        expect(mockOnClick).toHaveBeenCalledWith([-6.2, 106.8])
    })

    it('removes event listener on unmount', () => {
        const mockOnClick = jest.fn()
        const mockMap = {
            on: jest.fn(),
            off: jest.fn(),
        }

        ;(useMap as jest.Mock).mockReturnValue(mockMap)

        const { unmount } = render(<MapClickHandler onClick={mockOnClick} />)

        const handleClick = (mockMap.on as jest.Mock).mock.calls[0][1]

        unmount()

        expect(mockMap.off).toHaveBeenCalledWith('click', handleClick)
    })
})
