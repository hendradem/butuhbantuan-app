import React from 'react'
import { render, screen } from '@testing-library/react'
import SearchSheet from './SearchSheet'
import '@testing-library/jest-dom'

// Mocks for all custom hooks used in the component
jest.mock('../../../store/useSearchSeet', () => () => ({
    isOpen: true,
    snapPoint: 0,
    onClose: jest.fn(),
}))

jest.mock('../../../store/useSearchData', () => () => ({
    searchResults: [],
    isLoading: false,
    isActive: false,
    setIsActive: jest.fn(),
    updateSearchCoordinate: jest.fn(),
}))

jest.mock('../../../store/useUserLocationData', () => () => ({
    updateFullAddress: jest.fn(),
}))

// Mocks for child components
jest.mock('../core/CoreSheet', () => (props: any) => (
    <div data-testid="core-sheet">{props.children}</div>
))

jest.mock('./partials/HeaderSection', () => () => (
    <div data-testid="header-section">Header</div>
))

jest.mock('./partials/SearchResult', () => (props: any) => (
    <div data-testid="search-result">
        {JSON.stringify(props.locationResult)}
    </div>
))

jest.mock('../../search/main/MainSearchBox', () => () => (
    <input data-testid="search-box" placeholder="Cari lokasi" />
))

jest.mock('../../commons/InfoState', () => (props: any) => (
    <div data-testid="info-state">{props.title}</div>
))

describe('SearchSheet', () => {
    it('renders correctly with empty search results and info state', () => {
        render(<SearchSheet />)

        expect(screen.getByTestId('search-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('core-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('search-box')).toBeInTheDocument()
        expect(screen.getByTestId('info-state')).toHaveTextContent(
            'Cari bantuan di sekitarmu'
        )
        expect(screen.getByTestId('search-result')).toHaveTextContent('[]')
    })
})
