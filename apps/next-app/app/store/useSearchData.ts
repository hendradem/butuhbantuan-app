import { create } from 'zustand'

interface SearchData {
    isActive: boolean
    isLoading: boolean
    searchResults: []
    searchQuery: string
    setSearchResults: (searchResults: []) => void
    setIsLoading: (isLoading: boolean) => void
    setIsActive: (isActive: boolean) => void
    setSearchQuery: (searchQuery: string) => void
}

const useSearchData = create<SearchData>((set) => ({
    isActive: false,
    isLoading: false,
    searchQuery: '',
    searchResults: [],
    setSearchResults: (searchResults: []) => set({ searchResults }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
    setIsActive: (isActive: boolean) => set({ isActive }),
    setSearchQuery: (searchQuery: string) => set({ searchQuery }),
}))

export default useSearchData
