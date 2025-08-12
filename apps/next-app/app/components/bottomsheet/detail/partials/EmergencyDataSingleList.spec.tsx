// __tests__/EmergencyDataSingleList.test.tsx

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EmergencyDataSingleList from './EmergencyDataSingleList'

// Mock utils
jest.mock('../../../../utils/textTruncate', () => ({
    truncateText: (text: string) => text,
}))
jest.mock('../../../../utils/cityNameFormat', () => ({
    cityNameFormat: (text: string) => text,
}))

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}))

// Mock Icon
jest.mock('../../../ui/Icon', () => ({
    __esModule: true,
    default: (props: any) => <span data-testid="icon">{props.name}</span>,
}))

// Mock useConfirmationSheet *langsung saat deklarasi*
const onOpenMock = jest.fn()
const setCallTypeMock = jest.fn()
const setCallNumberMock = jest.fn()

jest.mock('../../../../store/useConfirmationSheet', () => ({
    __esModule: true,
    default: () => ({
        onOpen: onOpenMock,
        setCallType: setCallTypeMock,
        setCallNumber: setCallNumberMock,
    }),
}))

describe('EmergencyDataSingleList', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    const mockData = {
        emergencyData: {
            name: 'Emergency Name',
            organization_logo: '/logo.png',
            organization_name: 'Organization Name',
            is_dispatcher: true,
            address: {
                regency: 'Jakarta',
            },
            type_of_service: 'Ambulance',
            contact: {
                whatsapp: '08123456789',
                phone: '08987654321',
            },
        },
        trip: {
            duration: 9,
        },
    }

    it('renders emergency data correctly', () => {
        render(<EmergencyDataSingleList data={mockData} />)

        expect(screen.getByText('Emergency Name')).toBeInTheDocument()
        expect(screen.getByText('Organization Name')).toBeInTheDocument()
        expect(screen.getByText('Jakarta')).toBeInTheDocument()
        expect(screen.getByText('Ambulance')).toBeInTheDocument()
    })

    it('calls onOpen and setCallType/Number on Whatsapp click', () => {
        render(<EmergencyDataSingleList data={mockData} />)
        fireEvent.click(screen.getByText('Whatsapp'))

        expect(onOpenMock).toHaveBeenCalled()
        expect(setCallTypeMock).toHaveBeenCalledWith('whatsapp')
        expect(setCallNumberMock).toHaveBeenCalledWith('08123456789')
    })

    it('calls onOpen and setCallType/Number on Phone click', () => {
        render(<EmergencyDataSingleList data={mockData} />)
        fireEvent.click(screen.getByText('Telfon'))

        expect(onOpenMock).toHaveBeenCalled()
        expect(setCallTypeMock).toHaveBeenCalledWith('phone')
        expect(setCallNumberMock).toHaveBeenCalledWith('08987654321')
    })

    it('disables buttons if contact is null', () => {
        const dataWithNullContact = {
            ...mockData,
            emergencyData: {
                ...mockData.emergencyData,
                contact: {
                    whatsapp: null,
                    phone: null,
                },
            },
        }

        render(<EmergencyDataSingleList data={dataWithNullContact} />)

        expect(screen.getByText('Whatsapp')).toBeDisabled()
        expect(screen.getByText('Telfon')).toBeDisabled()
    })
})
