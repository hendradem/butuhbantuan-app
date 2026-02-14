import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import EmergencyPage from './Emergency'

// Mock dynamic imports and client-side components
jest.mock('../maps/leaflet/Leaflet', () => () => (
    <div data-testid="mock-leaflet">Mock Leaflet</div>
))

jest.mock('../menu/BottomMenu', () => () => (
    <div data-testid="mock-bottom-menu">Mock Bottom Menu</div>
))

jest.mock('../commons/AddToHomeScreenBanner', () => () => (
    <div data-testid="mock-banner">Mock Banner</div>
))

jest.mock('../../utils/setViewportHeight', () => ({
    setRealViewportHeight: jest.fn(),
}))

describe('EmergencyPage', () => {
    it('renders all main sections (banner, maps, bottom menu)', async () => {
        render(<EmergencyPage />)

        await waitFor(() => {
            expect(screen.getByTestId('banner-wrapper')).toBeInTheDocument()
            expect(screen.getByTestId('maps-wrapper')).toBeInTheDocument()
            expect(
                screen.getByTestId('bottom-menu-wrapper')
            ).toBeInTheDocument()

            expect(screen.getByTestId('mock-banner')).toBeInTheDocument()
            expect(screen.getByTestId('mock-leaflet')).toBeInTheDocument()
            expect(screen.getByTestId('mock-bottom-menu')).toBeInTheDocument()
        })
    })
})
