import React from 'react'
import { render, screen } from '@testing-library/react'
import { ReactQueryClientProvider } from '../ReactQueryClientProvider'
import { useQuery } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// Example child component using a query
const DummyComponent = () => {
    const { data, isSuccess } = useQuery({
        queryKey: ['dummy'],
        queryFn: () => 'Hello from query!',
        staleTime: Infinity,
    })

    if (!isSuccess) return <div>Loading...</div>
    return <div>{data}</div>
}

describe('ReactQueryClientProvider', () => {
    it('provides a React Query context to its children', async () => {
        render(
            <ReactQueryClientProvider>
                <DummyComponent />
            </ReactQueryClientProvider>
        )

        expect(await screen.findByText('Hello from query!')).toBeInTheDocument()
    })
})
