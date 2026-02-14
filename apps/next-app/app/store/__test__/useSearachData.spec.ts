import useSearchData from '@/store/useSearchData'

describe('useSearchData store', () => {
    beforeEach(() => {
        useSearchData.setState({
            lat: 0,
            lng: 0,
            isActive: false,
            isLoading: false,
            searchQuery: '',
            searchResults: [],
        })
    })

    it('should have initial state', () => {
        const state = useSearchData.getState()
        expect(state.lat).toBe(0)
        expect(state.lng).toBe(0)
        expect(state.isActive).toBe(false)
        expect(state.isLoading).toBe(false)
        expect(state.searchQuery).toBe('')
        expect(state.searchResults).toEqual([])
    })

    it('should update search coordinates', () => {
        useSearchData.getState().updateSearchCoordinate(-6.2, 106.8)
        const state = useSearchData.getState()
        expect(state.lat).toBe(-6.2)
        expect(state.lng).toBe(106.8)
    })

    it('should update search results', () => {
        const mockResults = [{ name: 'Hospital' }, { name: 'Police Station' }]
        useSearchData.getState().setSearchResults(mockResults as any)
        expect(useSearchData.getState().searchResults).toEqual(mockResults)
    })

    it('should update isLoading', () => {
        useSearchData.getState().setIsLoading(true)
        expect(useSearchData.getState().isLoading).toBe(true)
    })

    it('should update isActive', () => {
        useSearchData.getState().setIsActive(true)
        expect(useSearchData.getState().isActive).toBe(true)
    })

    it('should update searchQuery', () => {
        useSearchData.getState().setSearchQuery('Jakarta')
        expect(useSearchData.getState().searchQuery).toBe('Jakarta')
    })
})
