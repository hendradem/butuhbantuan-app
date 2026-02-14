import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AvailableServiceList from '../AvailableServiceList'

// ✅ Mock Zustand hook directly — avoid casting in tests
const mockSetMapZoom = jest.fn()

jest.mock('../../../store/useLeaflet', () => ({
    __esModule: true,
    default: () => ({
        setMapZoom: mockSetMapZoom,
    }),
}))

describe('AvailableServiceList', () => {
    const mockHandleServiceClick = jest.fn()

    const mockEmergencyTypeData = {
        data: [
            { name: 'Fire', icon: 'fire-icon' },
            { name: 'Flood', icon: 'flood-icon' },
        ],
    }

    it('renders services and calls handleServiceClick', () => {
        render(
            <AvailableServiceList
                emergencyTypeData={mockEmergencyTypeData}
                handleServiceClick={mockHandleServiceClick}
            />
        )

        fireEvent.click(screen.getByText('Fire'))
        expect(mockHandleServiceClick).toHaveBeenCalledWith({
            name: 'Fire',
            icon: 'fire-icon',
        })
    })
})
