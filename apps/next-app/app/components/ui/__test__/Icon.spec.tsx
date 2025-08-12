import React from 'react'
import { render } from '@testing-library/react'
import Icon from '../Icon'

// Mock Iconify karena aslinya render SVG/inline yang berat
jest.mock('@iconify/react', () => ({
    Icon: ({ icon, className }: { icon: string; className?: string }) => (
        <span data-testid="icon" data-icon={icon} className={className} />
    ),
}))

describe('Icon', () => {
    it('renders with correct icon name and className', () => {
        const { getByTestId } = render(
            <Icon name="mdi:home" className="text-blue-500" />
        )

        const icon = getByTestId('icon')
        expect(icon).toBeInTheDocument()
        expect(icon).toHaveAttribute('data-icon', 'mdi:home')
        expect(icon).toHaveClass('text-blue-500')
    })
})
