import { render, screen } from '@testing-library/react'
import ExploreDetailSheet from './ExploreDetailSheet'
import useExploreSheet from '@/store/useExploreSheet'

// 🧪 Mock the Zustand store
jest.mock('../../../store/useExploreSheet', () => ({
    __esModule: true,
    default: jest.fn(),
}))

jest.mock('../core/CoreSheet', () => ({
    __esModule: true,
    default: ({ children, header }: any) => (
        <div data-testid="mock-core-sheet">
            <div>{header}</div>
            <div>{children}</div>
        </div>
    ),
}))

describe('ExploreDetailSheet', () => {
    it('renders CoreSheet with HeaderSection and ContentSection', () => {
        ;(useExploreSheet as jest.Mock).mockReturnValue({ isOpen: true })

        render(<ExploreDetailSheet />)

        expect(screen.getByTestId('explore-detail-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('mock-core-sheet')).toBeInTheDocument()

        expect(
            screen.getByTestId('explore-detail-sheet-content')
        ).toBeInTheDocument()
    })
})
