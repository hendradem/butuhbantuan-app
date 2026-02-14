import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddToHomeScreenBanner from '../AddToHomeScreenBanner'

const STORAGE_KEY = 'pwa-install-dismissed'

// Mock localStorage
beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
})

jest.mock('../../ui/Icon', () => () => <span data-testid="icon" />)

describe('AddToHomeScreenBanner', () => {
    it('renders the banner if not dismissed', () => {
        render(<AddToHomeScreenBanner />)
        expect(screen.getByText('Install Butuhbantuan')).toBeInTheDocument()
        expect(
            screen.getByText('Sekali klik, penggunaan lebih mudah.')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Install/i })
        ).toBeInTheDocument()
    })

    it('dismisses the banner on click', () => {
        render(<AddToHomeScreenBanner />)

        const dismissBtn = screen.getByRole('button', { name: /Install/i })
            .nextSibling as HTMLElement

        fireEvent.click(dismissBtn)

        expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })
})
