import React from 'react'
import { render, screen } from '@testing-library/react'
import EmptyState from '../EmptyState'
import '@testing-library/jest-dom'

// Mock Next.js Image
jest.mock('next/image', () => (props: any) => {
    return <img {...props} alt={props.alt || 'mocked image'} />
})

describe('EmptyState', () => {
    it('renders with title and description', () => {
        render(
            <EmptyState
                title="No Data Found"
                description="We couldn't find what you were looking for."
                size="sm"
            />
        )

        expect(screen.getByText('No Data Found')).toBeInTheDocument()
        expect(
            screen.getByText("We couldn't find what you were looking for.")
        ).toBeInTheDocument()

        const image = screen.getByRole('img')
        expect(image).toHaveAttribute('width', '180')
        expect(image).toHaveAttribute('height', '180')
        expect(image).toHaveAttribute(
            'src',
            '/assets/illustration/core/data-not-found-2.svg'
        )
    })

    it('renders with CTA content', () => {
        render(
            <EmptyState
                title="Oops!"
                size="xs"
                cta={<button>Try Again</button>}
            />
        )

        expect(screen.getByText('Oops!')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
})
