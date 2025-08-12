import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Onboarding from './UserOnboarding'

// ✅ Mock Zustand store
const mockSetIsOnboarding = jest.fn()

jest.mock('../../store/useOnboarding', () => ({
    __esModule: true,
    default: (selector: any) =>
        selector({
            setIsOnboarding: mockSetIsOnboarding,
        }),
}))
describe('Onboarding component', () => {
    beforeEach(() => {
        mockSetIsOnboarding.mockClear()
        localStorage.clear()
    })

    it('renders first onboarding step correctly', () => {
        render(<Onboarding />)

        expect(screen.getByText('Cari Bantuan Darurat')).toBeInTheDocument()
        expect(
            screen.getByText(
                'Cari bantuan untuk keadaan darurat dengan cepat dan mudah dengan Butuhbantuan'
            )
        ).toBeInTheDocument()
    })

    it('goes to next step when Next is clicked', () => {
        render(<Onboarding />)

        fireEvent.click(screen.getByText('Next'))

        expect(
            screen.getByText('Temukan berbagai jenis bantuan')
        ).toBeInTheDocument()
    })

    test('finishes onboarding when Skip is clicked', () => {
        render(<Onboarding />)

        const skipButton = screen.getByText(/skip/i)
        fireEvent.click(skipButton)

        expect(localStorage.getItem('onboarding')).toBe('false')
        expect(mockSetIsOnboarding).toHaveBeenCalledWith(false)
    })
})
