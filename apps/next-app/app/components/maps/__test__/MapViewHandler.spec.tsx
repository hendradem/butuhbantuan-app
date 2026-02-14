// __tests__/MapViewHandler.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import { useMap } from 'react-leaflet'
import MapViewHandler from '../leaflet/map-view-handler'
import useLeaflet from '@/store/useLeaflet'

jest.mock('react-leaflet', () => ({
    useMap: jest.fn(),
}))

jest.mock('../../../store/useLeaflet', () => ({
    __esModule: true,
    default: jest.fn(),
}))

describe('MapViewHandler', () => {
    const mockSetView = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        // mock useMap
        ;(useMap as jest.Mock).mockReturnValue({
            setView: mockSetView,
        })

        // mock Zustand store
        ;(useLeaflet as jest.Mock).mockImplementation((selector: any) =>
            selector({ zoom: 14 })
        )
    })

    it('calls map.setView with latlng and zoom on mount', () => {
        render(<MapViewHandler latlng={[1.23, 4.56]} />)

        expect(mockSetView).toHaveBeenCalledWith([1.23, 4.56], 14)
    })

    it('does not call setView if latlng is falsy', () => {
        render(<MapViewHandler latlng={null as any} />)

        expect(mockSetView).not.toHaveBeenCalled()
    })
})
