import { render, screen, fireEvent } from '@testing-library/react'
import ErrorSheet from './ErrorSheet'

// ✅ mock `useErrorSheet`
jest.mock('../../../store/useErrorSheet', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        isOpen: true,
        onClose: jest.fn(),
        errorMessage: 'permission_denied',
    })),
}))

// ✅ mock CoreSheet
jest.mock('../core/CoreSheet', () => ({
    __esModule: true,
    default: ({ children }: any) => (
        <div data-testid="core-sheet-mock">{children}</div>
    ),
}))

// ✅ mock HeaderSection
jest.mock('./partials/HeaderSection')

// ✅ mock Image
jest.mock('next/image', () => (props: any) => {
    // You can make it more complete if needed
    return <img {...props} alt="mocked image" data-testid="mock-image" />
})

// ✅ mock Button
jest.mock('../../ui/Button', () => ({
    Button: ({ children, onClick }: any) => (
        <button onClick={onClick} data-testid="mock-button">
            {children}
        </button>
    ),
}))

describe('<ErrorSheet />', () => {
    it('renders permission_denied message correctly', () => {
        render(<ErrorSheet />)

        expect(screen.getByTestId('error-sheet')).toBeInTheDocument()
        expect(screen.getByTestId('core-sheet-mock')).toBeInTheDocument()
        expect(screen.getByText('Aktifkan GPS')).toBeInTheDocument()
        expect(screen.getByTestId('mock-image')).toBeInTheDocument()
        expect(screen.getByText('Aktifkan GPS')).toBeInTheDocument()
        expect(screen.getByText(/mendapatkan layanan/i)).toBeInTheDocument()
    })

    it('reloads page when button clicked', () => {
        render(<ErrorSheet />)

        const reloadButton = screen.getByTestId('mock-button')
        fireEvent.click(reloadButton)

        expect(window.location.href).toBe('http://localhost/')
    })
})
