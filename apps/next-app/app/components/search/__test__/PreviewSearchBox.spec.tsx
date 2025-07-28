import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PreviewSearchBox from '../preview/PreviewSearchBox'

const mockUpdateIsGetCurrentLocation = jest.fn()
const mockOnOpen = jest.fn()

jest.mock('../../../store/useUserLocationData', () => ({
    __esModule: true,
    default: () => ({
        fullAddress: 'Jl. Merdeka No.1, Bandung',
        updateIsGetCurrentLocation: mockUpdateIsGetCurrentLocation,
    }),
}))

jest.mock('../../../store/useSearchSeet', () => ({
    __esModule: true,
    default: () => ({
        onOpen: mockOnOpen,
    }),
}))

describe('PreviewSearchBox', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders the full address', () => {
        render(<PreviewSearchBox />)
        expect(
            screen.getByText('Jl. Merdeka No.1, Bandung')
        ).toBeInTheDocument()
    })

    it('calls onOpen when search box is clicked', () => {
        render(<PreviewSearchBox />)
        fireEvent.click(screen.getByText('Jl. Merdeka No.1, Bandung'))
        expect(mockOnOpen).toHaveBeenCalled()
    })

    it('calls updateIsGetCurrentLocation when location button is clicked', () => {
        render(<PreviewSearchBox />)
        const button = screen.getByRole('button')
        fireEvent.click(button)
        expect(mockUpdateIsGetCurrentLocation).toHaveBeenCalledWith(true)
    })
})
