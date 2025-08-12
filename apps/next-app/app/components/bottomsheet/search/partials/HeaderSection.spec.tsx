import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import HeaderSection from './HeaderSection'

describe('HeaderSection', () => {
    it('renders title and close button', () => {
        render(<HeaderSection />)
        expect(screen.getByText('Cari Bantuan')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('calls close and clear functions when close button is clicked', () => {
        render(<HeaderSection />)

        fireEvent.click(screen.getByRole('button'))
    })
})
