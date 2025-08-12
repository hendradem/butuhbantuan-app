import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import HeaderSection from './HeaderSection'

// Mock Icon component
jest.mock('../../../ui/Icon', () => ({
    __esModule: true,
    default: ({ name, className }: any) => (
        <span data-testid="icon" data-icon-name={name} className={className} />
    ),
}))

describe('HeaderSection', () => {
    const mockData = {
        emergency: {
            emergencyData: {
                name: 'Emergency Name',
            },
            trip: {
                duration: 6.5, // will be *2 => 12 menit
            },
        },
        emergencyType: {
            icon: 'fluent:alert-16-filled',
        },
    }

    const mockHandleClose = jest.fn()

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders correctly with valid data', () => {
        render(
            <HeaderSection
                data={mockData}
                handleCloseDetailSheet={mockHandleClose}
            />
        )

        expect(screen.getByText('Emergency Name')).toBeInTheDocument()
        expect(
            screen.getByText('12 menit dari lokasimu saat ini')
        ).toBeInTheDocument()

        // Icon should be rendered with correct icon name
        const icons = screen.getAllByTestId('icon')
        expect(icons[0]).toHaveAttribute(
            'data-icon-name',
            'fluent:alert-16-filled'
        )
        expect(icons[1]).toHaveAttribute('data-icon-name', 'ion:close')
    })

    it('calls handleCloseDetailSheet when close button is clicked', () => {
        render(
            <HeaderSection
                data={mockData}
                handleCloseDetailSheet={mockHandleClose}
            />
        )

        const closeBtn = screen.getByTestId('close-detail-sheet-button')
        fireEvent.click(closeBtn)

        expect(mockHandleClose).toHaveBeenCalledTimes(1)
    })

    it('returns null if emergencyData or emergencyType is missing', () => {
        const { container } = render(
            <HeaderSection
                data={{ emergency: null, emergencyType: null }}
                handleCloseDetailSheet={mockHandleClose}
            />
        )

        expect(container.firstChild).toBeNull()
    })
})
