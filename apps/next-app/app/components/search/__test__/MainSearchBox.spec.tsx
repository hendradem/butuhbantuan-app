import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBox from '../main/MainSearchBox'

// Mock store functions
const mockSetSearchQuery = jest.fn()
const mockSetSearchResults = jest.fn()
const mockSetIsLoading = jest.fn()
const mockSetIsActive = jest.fn()
const mockUpdateLocation = jest.fn()
const mockOnClose = jest.fn()

jest.mock('../../../store/useUserLocationData', () => ({
    __esModule: true,
    default: () => ({
        fullAddress: '',
        updateIsGetCurrentLocation: mockUpdateLocation,
    }),
}))

jest.mock('../../../store/useSearchData', () => ({
    __esModule: true,
    default: () => ({
        searchQuery: '',
        setSearchQuery: mockSetSearchQuery,
        setSearchResults: mockSetSearchResults,
        setIsLoading: mockSetIsLoading,
        setIsActive: mockSetIsActive,
    }),
}))

jest.mock('../../../store/useSearchSeet', () => ({
    __esModule: true,
    default: () => ({
        onClose: mockOnClose,
    }),
}))

jest.mock('../../../store/api/location.api', () => ({
    __esModule: true,
    useAddressLocation: () => ({
        data: undefined,
        refetch: jest.fn(),
        isLoading: false,
    }),
}))

describe('SearchBox', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders correctly', () => {
        render(<SearchBox />)
        expect(
            screen.getByPlaceholderText('Search places, addresses...')
        ).toBeInTheDocument()
    })

    it('calls updateIsGetCurrentLocation and onClose when location button clicked', () => {
        render(<SearchBox />)
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[0]) // location button
        expect(mockUpdateLocation).toHaveBeenCalledWith(true)
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('updates input value on change', () => {
        render(<SearchBox />)
        const input = screen.getByPlaceholderText('Search places, addresses...')
        fireEvent.change(input, { target: { value: 'Bandung' } })

        expect(input).toHaveValue('Bandung')
        expect(mockSetIsLoading).toHaveBeenCalledWith(true)
        expect(mockSetIsActive).toHaveBeenCalledWith(true)
    })
})
