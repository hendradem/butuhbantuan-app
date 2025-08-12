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

describe('ConfirmationSheet HeaderSection', () => {
    const handleCloseMock = jest.fn()

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders correctly and triggers handleClose on click', () => {
        render(<HeaderSection handleClose={handleCloseMock} />)

        // Check heading is rendered
        expect(
            screen.getByTestId('confirmation-sheet-heading')
        ).toBeInTheDocument()

        // Check icon rendered
        const icon = screen.getByTestId('icon')
        expect(icon).toHaveAttribute('data-icon-name', 'ion:close')

        // Trigger close
        const button = screen.getByRole('button')
        fireEvent.click(button)
        expect(handleCloseMock).toHaveBeenCalledTimes(1)
    })
})
