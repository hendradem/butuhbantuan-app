import { create } from 'zustand'

interface SearchData {
    lat: number
    lng: number
    isActive: boolean
    isLoading: boolean
    searchResults: []
    searchQuery: string
    setSearchResults: (searchResults: []) => void
    setIsLoading: (isLoading: boolean) => void
    setIsActive: (isActive: boolean) => void
    setSearchQuery: (searchQuery: string) => void
    updateSearchCoordinate: (lat: number, lng: number) => void
}

const useSearchData = create<SearchData>((set) => ({
    lat: 0,
    lng: 0,
    isActive: false,
    isLoading: false,
    searchQuery: '',
    searchResults: [],
    setSearchResults: (searchResults: []) => set({ searchResults }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
    setIsActive: (isActive: boolean) => set({ isActive }),
    setSearchQuery: (searchQuery: string) => set({ searchQuery }),
    updateSearchCoordinate: (lat: number, lng: number) => set({ lat, lng }),
}))

export default useSearchData
