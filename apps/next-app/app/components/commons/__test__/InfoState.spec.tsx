import React from 'react'
import { render, screen } from '@testing-library/react'
import InfoState from '../InfoState'
import '@testing-library/jest-dom'

// Mock next/image
jest.mock('next/image', () => (props: any) => {
    return <img {...props} alt={props.alt || 'mocked image'} />
})

describe('InfoState', () => {
    it('renders title and description correctly', () => {
        render(
            <InfoState
                title="Search Something"
                description="Please type a keyword to begin."
                size="sm"
            />
        )

        expect(screen.getByText('Search Something')).toBeInTheDocument()
        expect(
            screen.getByText('Please type a keyword to begin.')
        ).toBeInTheDocument()

        const image = screen.getByRole('img')
        expect(image).toHaveAttribute(
            'src',
            '/assets/illustration/core/search.svg'
        )
        expect(image).toHaveAttribute('width', '180')
        expect(image).toHaveAttribute('height', '180')
    })

    it('renders CTA if provided', () => {
        render(
            <InfoState title="Search" size="xs" cta={<button>Start</button>} />
        )

        expect(screen.getByText('Search')).toBeInTheDocument()
        expect(screen.getByText('Start')).toBeInTheDocument()
    })
})
