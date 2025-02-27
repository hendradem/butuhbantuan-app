import { create } from 'zustand'

const SAMPLE_LOCATIONS: any[] = [
    {
        id: '1',
        name: 'PSC SES',
        type: ['Emergency'],
        organization: 'Dinkes Kab. Sleman',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705743489/butuhbantuan/p6ldfcxxrjmxvnwjwkin.jpg',
        coordinates: [110.3539, -7.7186],
        address: {
            fullAddress: 'Tridadi, Kec. Sleman, Kabupaten Sleman',
            regency: 'Sleman',
        },
        contact: {
            whatsapp: '087808885333',
            telp: '02748609000',
        },
    },
    {
        id: '2',
        name: 'PMI Sleman',
        type: ['Emergency', 'Transport'],
        organization: 'Palang Merah Indonesia',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png',
        coordinates: [110.345, -7.7063],
        address: {
            fullAddress: 'Tridadi, Kec. Sleman, Kabupaten Sleman',
            regency: 'Sleman',
        },
        contact: {
            whatsapp: '087808885333',
            telp: '0274868900',
        },
    },
    {
        id: '3',
        name: 'RSA UGM',
        type: ['Emergency'],
        organization: 'Rumah Sakit Akademik UGM',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744168/butuhbantuan/uvthle5jxewt0hrt9gtg.webp',
        coordinates: [110.3479, -7.7437],
        address: {
            fullAddress: 'Tridadi, Kec. Sleman, Kabupaten Sleman',
            regency: 'Sleman',
        },
        contact: {
            whatsapp: '087808885333',
            telp: '0274868900',
        },
    },
    {
        id: '4',
        name: 'MPD Peduli',
        type: ['Emergency', 'Transport'],
        organization: 'Yayasan MPD Peduli',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744433/butuhbantuan/iicqfihmm4uocius8cbe.png',
        coordinates: [110.3741967, -7.7607825],
        address: {
            fullAddress: 'Pogung, Kec. Sleman, Kabupaten Sleman',
            regency: 'Sleman',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
    },
]

type selectedEmergencyDataType = {
    selectedEmergencyData?: any
    selectedEmergencyType?: any
}

type State = {
    emergencyData: any
    selectedEmergencyData: selectedEmergencyDataType
}

type Action = {
    updateEmergencyData: (emergencyData: State['emergencyData']) => void
    updateSelectedEmergencyData: (
        selectedEmergencyData: State['selectedEmergencyData']
    ) => void
}

const useEmergencyData = create<State & Action>()((set) => ({
    emergencyData: SAMPLE_LOCATIONS,
    selectedEmergencyData: {},
    updateEmergencyData: (emergencyData) => {
        set(() => ({ emergencyData: emergencyData }))
    },
    updateSelectedEmergencyData: (selectedEmergencyData) => {
        set(() => ({ selectedEmergencyData: selectedEmergencyData }))
    },
}))

export default useEmergencyData
