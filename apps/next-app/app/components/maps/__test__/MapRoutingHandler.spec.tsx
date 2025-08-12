// 👇 Fix the L global before anything else
global.L = require('leaflet')

// ✅ Mock leaflet-routing-machine before it tries to patch L
jest.mock('leaflet-routing-machine', () => ({}))

import React from 'react'
import { render } from '@testing-library/react'
import { useMap } from 'react-leaflet'
import RoutingMachine from '../leaflet/map-routing-handler'
import useLeaflet from '@/store/useLeaflet'

// ✅ Mock react-leaflet
jest.mock('react-leaflet', () => ({
    useMap: jest.fn(),
}))

// ✅ Mock Zustand store
jest.mock('../../../store/useLeaflet', () => ({
    __esModule: true,
    default: jest.fn(),
}))

// ✅ Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    loading: jest.fn(() => 'toast-id'),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
}))

// ✅ Mock Leaflet module (default import)
jest.mock('leaflet', () => ({
    __esModule: true,
    default: {
        Routing: {
            control: jest.fn(() => ({
                addTo: jest.fn().mockReturnThis(),
                on: jest.fn(),
            })),
        },
        latLng: jest.fn((lat, lng) => ({ lat, lng })),
        latLngBounds: jest.fn(() => 'mockBounds'),
    },
}))

describe('RoutingMachine', () => {
    const mockFitBounds = jest.fn()
    const mockRemoveControl = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useMap as jest.Mock).mockReturnValue({
            fitBounds: mockFitBounds,
            removeControl: mockRemoveControl,
        })
        ;(useLeaflet as jest.Mock).mockImplementation((selector: any) =>
            selector({
                routeStartPoint: { lat: 1, lng: 2 },
                routeEndPoint: { lat: 3, lng: 4 },
                setMapZoom: jest.fn(),
            })
        )
    })

    it('renders and sets up route control', () => {
        render(<RoutingMachine />)

        // Check that leaflet Routing.control was called
        const leaflet = require('leaflet').default
        expect(leaflet.Routing.control).toHaveBeenCalled()
    })
})
