// app/components/bottomsheet/confirmation/__test__/ConfirmationSheet.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmationSheet from './ConfirmationSheet'

beforeAll(() => {
    // Suppress sheet height warning
    jest.spyOn(console, 'warn').mockImplementation((msg) => {
        if (
            typeof msg === 'string' &&
            msg.includes('Snap point is out of bounds')
        ) {
            return
        }
        console.warn(msg)
    })
})

// Mock dependencies
jest.mock('../../../store/useConfirmationSheet', () => ({
    __esModule: true,
    default: jest.fn(),
}))

jest.mock('react-hot-toast', () => ({
    __esModule: true,
    default: {
        success: jest.fn(),
    },
}))

// Mock internal components to avoid deep render issues
jest.mock('../confirmation/partials/HeaderSection', () => () => (
    <div data-testid="header-section" />
))
jest.mock('../../commons/ConfirmationState', () => (props: any) => (
    <div data-testid="confirmation-state">{props.cta}</div>
))
jest.mock('../../ui/Icon', () => (props: any) => (
    <div data-testid={`icon-${props.name}`} />
))

// Helper to update mock store return
const useConfirmationSheet =
    require('../../../store/useConfirmationSheet').default

describe('<ConfirmationSheet />', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders with whatsapp callType', () => {
        useConfirmationSheet.mockReturnValue({
            isOpen: true,
            callType: 'whatsapp',
            callNumber: '08123456789',
            onClose: jest.fn(),
        })

        render(<ConfirmationSheet />)

        expect(screen.getByTestId('confirmation-sheet')).toBeInTheDocument()
        expect(
            screen.getByTestId('confirmation-whatsapp-button')
        ).toBeInTheDocument()
        expect(
            screen.queryByTestId('confirmation-call-button')
        ).not.toBeInTheDocument()
        expect(
            screen.getByTestId('confirmation-cancel-button')
        ).toBeInTheDocument()
    })

    it('renders with phone callType', () => {
        useConfirmationSheet.mockReturnValue({
            isOpen: true,
            callType: 'phone',
            callNumber: '08123456789',
            onClose: jest.fn(),
        })

        render(<ConfirmationSheet />)

        expect(
            screen.getByTestId('confirmation-call-button')
        ).toBeInTheDocument()
        expect(
            screen.queryByTestId('confirmation-whatsapp-button')
        ).not.toBeInTheDocument()
    })

    it('calls toast and opens whatsapp link when whatsapp button clicked', () => {
        const onCloseMock = jest.fn()
        useConfirmationSheet.mockReturnValue({
            isOpen: true,
            callType: 'whatsapp',
            callNumber: '08123456789',
            onClose: onCloseMock,
        })

        const toast = require('react-hot-toast').default
        window.open = jest.fn()

        render(<ConfirmationSheet />)

        fireEvent.click(screen.getByTestId('confirmation-whatsapp-button'))

        expect(toast.success).toHaveBeenCalledWith(
            'Akan dihubungkan ke whatsapp',
            expect.any(Object)
        )
        expect(window.open).toHaveBeenCalledWith(
            'https://wa.me/628123456789',
            '_blank'
        )
    })

    it('opens phone link when call button clicked', () => {
        const onCloseMock = jest.fn()
        useConfirmationSheet.mockReturnValue({
            isOpen: true,
            callType: 'phone',
            callNumber: '08123456789',
            onClose: onCloseMock,
        })

        window.open = jest.fn()

        render(<ConfirmationSheet />)

        fireEvent.click(screen.getByTestId('confirmation-call-button'))

        expect(window.open).toHaveBeenCalledWith('tel:8123456789', '_blank') // without leading 0
    })

    it('calls onClose when cancel button clicked', () => {
        const onCloseMock = jest.fn()
        useConfirmationSheet.mockReturnValue({
            isOpen: true,
            callType: 'whatsapp',
            callNumber: '08123456789',
            onClose: onCloseMock,
        })

        render(<ConfirmationSheet />)

        fireEvent.click(screen.getByTestId('confirmation-cancel-button'))

        expect(onCloseMock).toHaveBeenCalled()
    })
})
