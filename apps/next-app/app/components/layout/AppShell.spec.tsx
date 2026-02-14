// app/components/layout/__tests__/AppShell.test.tsx
import { render, screen } from '@testing-library/react'
import AppShell from './AppShell'

// Mock semua bottomsheet component biar ringan dan tidak pecah
jest.mock('../bottomsheet/detail/DetailSheet', () => () => (
    <div data-testid="detail-sheet" />
))
jest.mock('../bottomsheet/explore/ExploreDetailSheet', () => () => (
    <div data-testid="explore-detail-sheet" />
))
jest.mock('../bottomsheet/search/SearchSheet', () => () => (
    <div data-testid="search-sheet" />
))
jest.mock('../bottomsheet/confirmation/ConfirmationSheet', () => () => (
    <div data-testid="confirmation-sheet" />
))
jest.mock('../bottomsheet/error/ErrorSheet', () => () => (
    <div data-testid="error-sheet" />
))

describe('<AppShell />', () => {
    it('renders children and all bottom sheet components', () => {
        render(
            <AppShell>
                <p>Test Content</p>
            </AppShell>
        )

        // Pastikan children muncul
        expect(screen.getByText('Test Content')).toBeInTheDocument()

        // Pastikan semua sheet component tampil
        expect(screen.getByTestId('detail-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('explore-detail-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('search-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('confirmation-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('error-sheet')).toBeInTheDocument()
    })
})
