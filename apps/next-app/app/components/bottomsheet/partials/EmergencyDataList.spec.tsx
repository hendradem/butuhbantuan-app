import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EmergencyDataList from './EmergencyDataList'
import '@testing-library/jest-dom'

jest.mock('../../../store/useConfirmationSheet', () => () => ({
    onOpen: jest.fn(),
    setCallType: jest.fn(),
    setCallNumber: jest.fn(),
}))

jest.mock('../../../store/useExploreSheet', () => () => ({
    onClose: jest.fn(),
}))

jest.mock('../../../store/useSearchSeet', () => () => ({
    onOpen: jest.fn(),
}))

jest.mock('../../../utils/cityNameFormat', () => ({
    cityNameFormat: (city: string) => city,
}))

jest.mock('../../../utils/textTruncate', () => ({
    truncateText: (text: string, _length: number) => text,
}))

// Icon and next/image stubs
jest.mock('../../ui/Icon', () => (props: any) => (
    <span data-testid="icon">{props.name}</span>
))
jest.mock('next/image', () => (props: any) => (
    <img {...props} alt={props.alt || 'image'} />
))

describe('EmergencyDataList', () => {
    const mockEmergencyData = [
        {
            emergencyData: {
                name: 'Test Emergency',
                organization_logo: '/logo.png',
                organization_name: 'Org Name',
                address: { regency: 'Jakarta' },
                type_of_service: 'Ambulance',
                is_dispatcher: true,
                contact: {
                    whatsapp: '08123456789',
                    phone: '08129876543',
                },
            },
            trip: { duration: 10 },
        },
    ]

    const handleSelectedEmergency = jest.fn()

    it('renders emergency data and triggers handlers', () => {
        render(
            <EmergencyDataList
                emergencyData={mockEmergencyData}
                handleSelectedEmergency={handleSelectedEmergency}
                selectedEmergencyName="Test Emergency"
            />
        )

        expect(screen.getByText('Test Emergency')).toBeInTheDocument()
        expect(screen.getByText('Org Name')).toBeInTheDocument()
        expect(screen.getByText('Jakarta')).toBeInTheDocument()

        const whatsappButton = screen.getByTestId('whatsapp-button')
        fireEvent.click(whatsappButton)
        expect(whatsappButton).toBeEnabled()

        const phoneButton = screen.getByTestId('phone-button')
        fireEvent.click(phoneButton)
        expect(phoneButton).toBeEnabled()
    })
})
