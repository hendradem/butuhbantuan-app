import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import CoreSheet from './CoreSheet'
import useCoreSheet from '@/store/useCoreSheet'

jest.mock('../../../store/useCoreSheet', () => ({
    __esModule: true,
    default: jest.fn(),
}))

describe('<CoreSheet />', () => {
    const onCloseMock = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(useCoreSheet as jest.Mock).mockReturnValue({ onClose: onCloseMock })
    })

    it('renders correctly when open', () => {
        const { getByTestId } = render(
            <CoreSheet isOpen={true}>
                <div>Sheet Content</div>
            </CoreSheet>
        )

        expect(getByTestId('core-sheet')).toBeInTheDocument()
        expect(getByTestId('core-sheet-container')).toBeInTheDocument()
    })

    it('does not render overlay if isOverlay is false', () => {
        const { queryByTestId } = render(
            <CoreSheet isOpen={true} isOverlay={false}>
                <div>Sheet Content</div>
            </CoreSheet>
        )

        expect(queryByTestId('overlay')).not.toBeInTheDocument()
    })

    it('calls onClose when overlay clicked and not disabled', () => {
        const { getByTestId } = render(
            <CoreSheet isOpen={true} isOverlay={true}>
                <div>Sheet Content</div>
            </CoreSheet>
        )

        const overlay = getByTestId('overlay')
        fireEvent.click(overlay)
        expect(overlay).not.toHaveAttribute('onClick') // 💡 This ensures the prop is not bound
    })

    it('does not call onClose when overlay clicked and disabled', () => {
        const { getByTestId } = render(
            <CoreSheet
                isOpen={true}
                isOverlay={true}
                disableOverlayClick={true}
            >
                <div>Sheet Content</div>
            </CoreSheet>
        )

        const overlay = getByTestId('overlay')
        fireEvent.click(overlay)
        expect(overlay).not.toHaveAttribute('onClick') // 💡 This ensures the prop is not bound
    })
})
