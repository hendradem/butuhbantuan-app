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
        responseTime: {
            duration: 0,
            distance: 0,
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
        responseTime: {
            duration: 0,
            distance: 0,
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
        responseTime: {
            duration: 0,
            distance: 0,
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
        responseTime: {
            duration: 0,
            distance: 0,
        },
    },
    {
        id: '5',
        name: 'PMI Kota Magelang',
        type: ['Emergency', 'Transport'],
        organization: 'Palang Merah Indonesia',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png',
        coordinates: [110.2015789, -7.4644763],
        address: {
            fullAddress: 'Kota Magelang',
            regency: 'Magelang',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
        responseTime: {
            duration: 0,
            distance: 0,
        },
    },
    {
        id: '6',
        name: 'PMI Kab. Magelang',
        type: ['Emergency', 'Transport'],
        organization: 'Palang Merah Indonesia',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png',
        coordinates: [110.2872649, -7.5836006],
        address: {
            fullAddress: 'Kab. Magelang',
            regency: 'Kab. Magelang',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
        responseTime: {
            duration: 0,
            distance: 0,
        },
    },
    {
        id: '7',
        name: 'RS Panti Nugroho',
        type: ['Emergency'],
        organization: 'Rumah Sakit Panti Nugroho',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAABQVBMVEX////+/v/4+P79/f/V1vhCUuL19//a4P9bWNWRAF5hcufg6//Ay/+YpPlKStaoAGPmAAmAAHapsvuNi9dvZ79iPKmNAIjOAEVPANGqAD3IAEqDAIyipfPf4v7J0f9TYc6tIGfbAD/hAC7oABz4AAD/AABaALQALPZSIbquG140UNhre+m+AFj7AABaAIBLLMZEMNSNAFN3AIOpAFNRYvP8+/5XN6utFW47Rd4xOe4lMOoNG+mCE4MoKba1uPlzAJGUk9mvKoNSAJaHjvOChe79GSb/OEafAHLx8v67wPpxO6r+eJT9nsH9T2H2KzS/AEmCk/L+an9rbuv/YXH/k6n9fpzNAChXZ+uBPoi5Cj7aMzr7Smn7X2//RFb8rNDVOFRCC5TQ0fgRELqOB3CMAC5miP+Hn/+xpuIAAM8AAOEgJOIhyuNEAAACHUlEQVR4AWxShWKjMAB9FErvgFQy3yCzcDZ3T+9GtpFpbe4u//8BlzKXh0SeRPEGBlL6+wqGYcJK2zCNj7wm9C/z7buTgYb5lq/XXY9kc/lClngu8C7dpQ2NTc0tuda29o6mxgY/eONjnV3dPb08/PHzFw97e7p///FevKm+/jAMB3KDQ/bwyGivro+NTzwbvclePjAwNT0zi7mfs/P5Ac4XBMxkCaBFrtXtf5kFS5B/AwMDfDHC45JSssiXlkO+kqU2yTbnQ77EF8djaNJVSq7m19Y3lja3iqXiFueba2W+UBHKAmhERUN3da22Xg43V/hmdbu2vbGz6xFCYlBfKW8v3D+obhzWjo5Pysun++EZ9RT1bbilc4/R/QvnMr98VFvfzM9XJq+uXRoQBog+xnw3M1uKnRw/5Lk/GTVMEZ2zUmkCJcG88wCmAlRXeHkDMBexTlNRCueOFcTmRLLg2zEnOaAJww4ykTBglCoWANOEieBOYaJeBYKoL9aGWA5L6ibO+J4lZxmLaFcG9RpYRZC+UlC/JXNMO2MqpSDe4yU496NoV1Vczc5qp11Kiwm5K1KoI6DKd4gS2jTNYFh+RaalOEeC84dh37J8AhO75zADUor60vcCRnJm53L6/uG+Yrl67YC7+zA37TylaoWZUb6cnq34ThAwKok4T727fIgtJe/vI+LpgPfXz9AAbCst4omnxkeY+D8mRpT0DAAFmVZhofI5ggAAAABJRU5ErkJggg==',
        coordinates: [110.4132672, -7.6720157],

        address: {
            fullAddress:
                'Jl. Kaliurang No.KM.17, Sukanan, Pakembinangun, Kec. Pakem, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55584',
            regency: 'Sleman',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
        responseTime: {
            duration: 0,
            distance: 0,
        },
    },
    {
        id: '8',
        name: 'PSC 119 YES',
        type: ['Emergency'],
        organization: 'Dinkes Kota Yogyakarta',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705743489/butuhbantuan/p6ldfcxxrjmxvnwjwkin.jpg',
        coordinates: [110.391782, -7.800995],

        address: {
            fullAddress:
                'Komplek Balaikota, Jl. Ireda, Muja Muju, Kec. Umbulharjo, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55165',
            regency: 'Yogyakarta',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
        responseTime: {
            duration: 0,
            distance: 0,
        },
    },
    {
        id: '8',
        name: 'PMI Kota Yogyakarta',
        type: ['Emergency', 'Transport'],
        organization: 'Palang Merah Indonesia',
        logo: 'https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png',
        coordinates: [110.3920925, -7.8261016],
        address: {
            fullAddress:
                'Jl. Tegal Gendu No.25, Prenggan, Kec. Kotagede, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55172',
            regency: 'Yogyakarta',
        },
        contact: {
            whatsapp: '087808885333',
            telp: null,
        },
        responseTime: {
            duration: 0,
            distance: 0,
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
