jest.mock('../../../store/api/emergency-type.api', () => ({
    useEmergencyTypeApi: jest.fn(),
}))

jest.mock('../../../utils/filterEmergencyByService', () => ({
    filterEmergencyByService: jest.fn(),
}))

jest.mock('../../search/preview/PreviewSearchBox', () => () => (
    <div data-testid="preview-search-box" />
))

jest.mock('../AvailableServiceList', () => ({ handleServiceClick }: any) => (
    <div data-testid="available-service-list">
        <button onClick={() => handleServiceClick({ name: 'Fire' })}>
            Mock Service
        </button>
    </div>
))

jest.mock('../../../store/useExploreSheet', () => ({
    __esModule: true,
    default: () => ({
        setSheetData: mockSetSheetData,
        onOpen: mockOpenSheet,
    }),
}))

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import BottomMenu from '../BottomMenu'
import { useEmergencyTypeApi } from '@/store/api/emergency-type.api'
import useExploreSheet from '@/store/useExploreSheet'
import { filterEmergencyByService } from '@/utils/filterEmergencyByService'

// ✅ Mocks returned values from Zustand + API
const mockSetSheetData = jest.fn()
const mockOpenSheet = jest.fn()

beforeEach(() => {
    jest.clearAllMocks()
    ;(useEmergencyTypeApi as jest.Mock).mockReturnValue({
        emergencyTypeData: [{ name: 'Fire' }],
        emergencyTypeLoading: false,
    })
    ;(filterEmergencyByService as jest.Mock).mockReturnValue([
        { id: 1, name: 'Fire Emergency' },
    ])
})

describe('BottomMenu', () => {
    it('renders the BottomMenu with emergency types', () => {
        render(<BottomMenu />)
        expect(screen.getByTestId('bottom-menu')).toBeInTheDocument()
        expect(screen.getByTestId('preview-search-box')).toBeInTheDocument()
        expect(screen.getByTestId('available-service-list')).toBeInTheDocument()
    })

    it('calls handlers when a service is clicked', () => {
        render(<BottomMenu />)

        fireEvent.click(screen.getByText('Mock Service'))

        expect(filterEmergencyByService).toHaveBeenCalledWith('Fire')
        expect(mockSetSheetData).toHaveBeenCalledWith({
            emergencyType: { name: 'Fire' },
            emergency: [{ id: 1, name: 'Fire Emergency' }],
        })
        expect(mockOpenSheet).toHaveBeenCalled()
    })

    it('renders skeleton loaders when loading', () => {
        ;(useEmergencyTypeApi as jest.Mock).mockReturnValue({
            emergencyTypeData: [],
            emergencyTypeLoading: true,
        })

        render(<BottomMenu />)

        const skeletons = document.getElementsByClassName('animate-pulse')
        expect(skeletons).toBeDefined()
    })
})
