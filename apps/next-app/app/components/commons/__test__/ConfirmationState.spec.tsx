import React from 'react'
import { render, screen } from '@testing-library/react'
import ConfirmationState from '../ConfirmationState'
import '@testing-library/jest-dom'

// Mock Next.js Image
jest.mock('next/image', () => (props: any) => {
    return <img {...props} alt={props.alt || 'mocked image'} />
})

describe('ConfirmationState', () => {
    it('renders with title and description', () => {
        render(
            <ConfirmationState
                title="Test Title"
                description="This is a test description"
                size="xs"
            />
        )

        const wrapper = screen.getByTestId('confirmation-sheet-content')
        expect(wrapper).toBeInTheDocument()

        expect(screen.getByText('Test Title')).toBeInTheDocument()
        expect(
            screen.getByText('This is a test description')
        ).toBeInTheDocument()

        // Image rendered with correct width/height for "xs"
        const image = screen.getByRole('img')
        expect(image).toHaveAttribute('width', '130')
        expect(image).toHaveAttribute('height', '130')
        expect(image).toHaveAttribute(
            'src',
            '/assets/illustration/core/confirmation.svg'
        )
    })

    it('renders optional CTA content', () => {
        render(
            <ConfirmationState
                title="Confirm"
                size="sm"
                cta={<button>Confirm Now</button>}
            />
        )

        expect(screen.getByText('Confirm Now')).toBeInTheDocument()
    })
})
