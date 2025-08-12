import useEmergencyData from '@/store/useEmergencyData'
import { EmergencyDataType, SelectedEmergencyDataType } from '@/types/emergency'

describe('useEmergencyData store', () => {
    const mockEmergencyData: EmergencyDataType[] = [
        {
            id: '1',
            name: 'Ambulance Jakarta',
            organization: 'RSUD Jakarta',
            organizationType: 'Hospital',
            logo: '/logos/ambulance.png',
            description: 'Layanan ambulance 24 jam wilayah DKI Jakarta.',
            coordinates: [106.827153, -6.17511],
            typeOfService: 'Ambulance',
            address: {
                district: 'Gambir',
                regency: 'Jakarta Pusat',
                province: 'DKI Jakarta',
                fullAddress: 'Jl. Medan Merdeka Selatan No.1, Gambir, Jakarta',
            },
            contact: {
                whatsapp: '081234567890',
                phone: '02112345678',
            },
        },
        {
            id: '2',
            name: 'Pemadam Kebakaran Bandung',
            organization: 'Dinas Pemadam',
            organizationType: 'Government',
            logo: '/logos/firefighter.png',
            description: 'Layanan pemadam kebakaran di Bandung.',
            coordinates: [107.619123, -6.917464],
            typeOfService: 'Pemadam',
            address: {
                district: 'Cicendo',
                regency: 'Bandung',
                province: 'Jawa Barat',
                fullAddress: 'Jl. ABC No.12, Cicendo, Bandung',
            },
            contact: {
                whatsapp: '089876543210',
                phone: '02298765432',
            },
        },
    ]

    const mockDispatcherData = [
        { id: 'd1', name: 'Dispatcher A' },
        { id: 'd2', name: 'Dispatcher B' },
    ]

    const mockSelectedEmergency: SelectedEmergencyDataType = {
        selectedEmergencyData: mockEmergencyData[0],
        selectedEmergencyType: 'Ambulance',
        selectedEmergencySource: 'detail',
    }

    beforeEach(() => {
        useEmergencyData.setState({
            emergencyData: [],
            dispatcherData: [],
            selectedEmergencyData: {
                selectedEmergencyData: null,
                selectedEmergencyType: null,
                selectedEmergencySource: 'map',
            },
        })
    })

    it('should update emergency data', () => {
        useEmergencyData.getState().updateEmergencyData(mockEmergencyData)
        expect(useEmergencyData.getState().emergencyData).toEqual(
            mockEmergencyData
        )
    })

    it('should update dispatcher data', () => {
        useEmergencyData.getState().updateDispatcherData(mockDispatcherData)
        expect(useEmergencyData.getState().dispatcherData).toEqual(
            mockDispatcherData
        )
    })

    it('should update selected emergency data', () => {
        useEmergencyData
            .getState()
            .updateSelectedEmergencyData(mockSelectedEmergency)
        expect(useEmergencyData.getState().selectedEmergencyData).toEqual(
            mockSelectedEmergency
        )
    })
})
