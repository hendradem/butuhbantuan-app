// Home.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Home from '../page'

// ✅ Mock components
jest.mock('../components/onboarding/UserOnboarding', () => () => (
    <div data-testid="user-onboarding">UserOnboarding</div>
))
jest.mock('../components/emergency/Emergency', () => () => (
    <div data-testid="emergency">Emergency</div>
))

// ✅ Mock Zustand store safely with factory
jest.mock('../store/useOnboarding', () => ({
    __esModule: true,
    default: jest.fn(),
}))

import useOnboardingStore from '../store/useOnboarding'

// Cast to mocked function type
const mockedUseOnboardingStore = useOnboardingStore as jest.Mock

describe('<Home />', () => {
    beforeEach(() => {
        localStorage.clear()
        jest.clearAllMocks()
    })

    it('renders UserOnboarding if localStorage is not "false" and isOnboarding is true', async () => {
        mockedUseOnboardingStore.mockReturnValue(true)
        localStorage.setItem('onboarding', 'true')

        render(<Home />)

        await waitFor(() =>
            expect(screen.getByTestId('user-onboarding')).toBeInTheDocument()
        )
    })

    it('renders Emergency if localStorage is "false"', async () => {
        mockedUseOnboardingStore.mockReturnValue(true)
        localStorage.setItem('onboarding', 'false')

        render(<Home />)

        await waitFor(() =>
            expect(screen.getByTestId('emergency')).toBeInTheDocument()
        )
    })

    it('renders Emergency if isOnboarding is false', async () => {
        mockedUseOnboardingStore.mockReturnValue(false)

        render(<Home />)

        await waitFor(() =>
            expect(screen.getByTestId('emergency')).toBeInTheDocument()
        )

        expect(localStorage.getItem('onboarding')).toBe('false')
    })
})
