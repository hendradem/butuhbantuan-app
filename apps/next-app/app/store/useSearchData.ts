import { create } from 'zustand'

interface SearchData {
    isActive: boolean
    isLoading: boolean
    searchResults: []
    setSearchResults: (searchResults: []) => void
    setIsLoading: (isLoading: boolean) => void
}

const useSearchData = create<SearchData>((set) => ({
    isActive: false,
    isLoading: false,
    searchResults: [],
    setSearchResults: (searchResults: []) => set({ searchResults }),
    setIsLoading: (isLoading: boolean) => set({ isLoading }),
}))

export default useSearchData
