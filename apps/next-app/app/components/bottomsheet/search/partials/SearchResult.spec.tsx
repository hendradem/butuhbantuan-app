import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchResult from './SearchResult'

// Mock Zustand store useSearchData
jest.mock('../../../../store/useSearchData', () => ({
    __esModule: true,
    default: () => ({
        isActive: true, // Ubah ke false untuk negative test
    }),
}))

describe('SearchResult', () => {
    const mockHandleSelected = jest.fn()

    it('renders empty state when no results and search is active', () => {
        render(
            <SearchResult
                locationResult={[]}
                handleSelectedAddress={mockHandleSelected}
            />
        )

        expect(
            screen.getByText('Pencarian tidak ditemukan')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cari lokasi di maps' })
        ).toBeInTheDocument()
    })

    it('renders results when locationResult is not empty', () => {
        const mockResults = [
            {
                place_name: 'place1',
                name: 'Taman Sari',
                address: 'Jl. Taman',
                formatted_city: 'Yogyakarta',
            },
        ]

        render(
            <SearchResult
                locationResult={mockResults}
                handleSelectedAddress={mockHandleSelected}
            />
        )

        expect(screen.getByText('Hasil pencarian')).toBeInTheDocument()
        expect(screen.getByText('Taman Sari')).toBeInTheDocument()
        expect(screen.getByText('Yogyakarta')).toBeInTheDocument()
        expect(screen.getByText('1 hasil pencarian')).toBeInTheDocument()
    })

    it('calls handleSelectedAddress when result is clicked', () => {
        const mockResults = [
            {
                place_name: 'place1',
                name: 'Taman Sari',
                address: 'Jl. Taman',
            },
        ]

        render(
            <SearchResult
                locationResult={mockResults}
                handleSelectedAddress={mockHandleSelected}
            />
        )

        const resultItem = screen.getByText('Taman Sari')
        fireEvent.click(resultItem)

        expect(mockHandleSelected).toHaveBeenCalledWith(
            mockResults[0],
            expect.any(Object)
        )
    })
})
