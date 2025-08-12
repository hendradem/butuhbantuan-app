import useEmergency from '@/store/useEmergency'

describe('useEmergency store', () => {
    beforeEach(() => {
        useEmergency.setState({
            filteredEmergency: [],
            selectedEmergency: null,
        })
    })

    it('should set filtered emergency data', () => {
        const mockFiltered = [
            { id: 1, name: 'Police' },
            { id: 2, name: 'Hospital' },
        ]

        useEmergency.getState().setFilteredEmergency(mockFiltered)
        expect(useEmergency.getState().filteredEmergency).toEqual(mockFiltered)
    })

    it('should set selected emergency data', () => {
        const mockSelected = { id: 2, name: 'Hospital' }

        useEmergency.getState().setSelectedEmergency(mockSelected)
        expect(useEmergency.getState().selectedEmergency).toEqual(mockSelected)
    })
})
