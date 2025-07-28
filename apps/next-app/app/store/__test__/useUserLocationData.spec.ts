import useUserLocationData from '@/store/useUserLocationData'

describe('useUserLocationData store', () => {
    beforeEach(() => {
        useUserLocationData.setState({
            lat: 0,
            long: 0,
            fullAddress: '',
            isRefetchMatrix: false,
            isGetCurrentLocation: false,
            currentRegion: {
                regency: { id: '', name: '' },
                province: { id: '', name: '' },
            },
        })
    })

    it('should update coordinates', () => {
        useUserLocationData.getState().updateCoordinate(1.23, 4.56)
        const state = useUserLocationData.getState()
        expect(state.lat).toBe(1.23)
        expect(state.long).toBe(4.56)
    })

    it('should update fullAddress', () => {
        useUserLocationData.getState().updateFullAddress('Jl. Contoh No. 1')
        expect(useUserLocationData.getState().fullAddress).toBe(
            'Jl. Contoh No. 1'
        )
    })

    it('should toggle isRefetchMatrix', () => {
        const store = useUserLocationData.getState()
        expect(store.isRefetchMatrix).toBe(false)
        store.updateRefetchMatrix()
        expect(useUserLocationData.getState().isRefetchMatrix).toBe(true)
        store.updateRefetchMatrix()
        expect(useUserLocationData.getState().isRefetchMatrix).toBe(false)
    })

    it('should update isGetCurrentLocation', () => {
        useUserLocationData.getState().updateIsGetCurrentLocation(true)
        expect(useUserLocationData.getState().isGetCurrentLocation).toBe(true)
    })

    it('should set currentRegion', () => {
        const region = {
            regency: { id: '123', name: 'Kota Contoh' },
            province: { id: '01', name: 'Provinsi Contoh' },
        }
        useUserLocationData.getState().setCurrentRegion(region)
        expect(useUserLocationData.getState().currentRegion).toEqual(region)
    })
})
