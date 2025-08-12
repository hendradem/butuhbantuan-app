import { render, screen } from '@testing-library/react'

// ✅ Mocks must come first!
jest.mock('../../../store/useDetailSheet', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        isOpen: true,
        detailSheetData: {
            emergency: [{ id: 1, name: 'Mock Emergency' }],
        },
        onClose: jest.fn(),
    })),
}))

jest.mock('../../../store/useLeaflet', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        resetLeafletRouting: jest.fn(),
    })),
}))

jest.mock('../core/CoreSheet', () => ({
    __esModule: true,
    default: ({ children }: any) => (
        <div data-testid="core-sheet-mock">{children}</div>
    ),
}))

jest.mock('./partials/HeaderSection', () => ({
    __esModule: true,
    default: () => <div data-testid="header-section-mock" />,
}))

jest.mock('./partials/EmergencyDataSingleList', () => ({
    __esModule: true,
    default: () => <div data-testid="emergency-data-list-mock" />,
}))

// ✅ After all mocks
import DetailSheet from './DetailSheet'

describe('<DetailSheet />', () => {
    it('renders correctly', () => {
        render(<DetailSheet />)

        expect(screen.getByTestId('detail-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('core-sheet-mock')).toBeInTheDocument()
        // expect(screen.getByTestId('header-section-mock')).toBeInTheDocument()
        expect(
            screen.getByTestId('emergency-data-list-mock')
        ).toBeInTheDocument()
    })
})
