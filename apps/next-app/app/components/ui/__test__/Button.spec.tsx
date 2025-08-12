import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
    it('renders children', () => {
        render(<Button>Click Me</Button>)
        expect(screen.getByText('Click Me')).toBeInTheDocument()
    })

    it('calls onClick when clicked', () => {
        const handleClick = jest.fn()
        render(<Button onClick={handleClick}>Click Me</Button>)

        fireEvent.click(screen.getByText('Click Me'))
        expect(handleClick).toHaveBeenCalled()
    })

    it('applies correct variant and size classes', () => {
        render(
            <Button variant="danger" size="lg">
                Delete
            </Button>
        )

        const button = screen.getByRole('button')
        expect(button).toHaveClass('bg-red-600')
        expect(button).toHaveClass('text-white')
        expect(button).toHaveClass('px-6')
        expect(button).toHaveClass('py-3')
        expect(button).toHaveClass('text-lg')
    })

    it('applies disabled styles and prevents click', () => {
        const handleClick = jest.fn()

        render(
            <Button disabled onClick={handleClick}>
                Disabled
            </Button>
        )

        const button = screen.getByRole('button')
        expect(button).toBeDisabled()
        expect(button).toHaveClass('opacity-50')
        expect(button).toHaveClass('cursor-not-allowed')

        fireEvent.click(button)
        expect(handleClick).not.toHaveBeenCalled()
    })

    it('applies custom className', () => {
        render(<Button className="custom-class">Test</Button>)
        expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
})
