'use client'
import React from 'react'
import { MapPin, ChevronRight } from 'lucide-react'
import EmptyState from '@/components/commons/EmptyState'
import useSearchData from '@/store/useSearchData'
import Icon from '@/components/ui/Icon'

interface SearchResultProps {
    locationResult: any[]
    handleSelectedAddress: (address: any, e: any) => void
}

const SearchResult = ({
    locationResult,
    handleSelectedAddress,
}: SearchResultProps) => {
    const { isActive: isSearchBoxActive } = useSearchData()

    const emptyDataCta = () => {
        return (
            <div className="w-full flex items-center justify-center">
                <button className="btn-dark">Cari lokasi di maps</button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg mb-5 px-3 overflow-hidden">
            <div>
                {locationResult.length == 0 && isSearchBoxActive && (
                    <EmptyState
                        size="xs"
                        title="Pencarian tidak ditemukan"
                        description="Pencarian tidak ditemukan, coba kata kunci lain, nama jalan, atau nama lokasi terdekatmu."
                        cta={emptyDataCta()}
                    />
                )}
            </div>

            <div>
                {locationResult.length > 0 && (
                    <div className="flex items-center justify-between mb-2 mt-4">
                        <span className="text-gray-800 text-[15px] font-medium">
                            Hasil pencarian
                        </span>
                        <span className="text-gray-400 text-sm">
                            {locationResult.length} hasil pencarian
                        </span>
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-100">
                {locationResult.map((location, index) => (
                    <div
                        key={`${location.place_name}-${index}`}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={(e) => handleSelectedAddress(location, e)}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-base truncate">
                                    {location.name || 'Unknown Location'}
                                </h4>
                                <p className="text-sm text-gray-600 line-clamp-1">
                                    {location.address ||
                                        location.formatted ||
                                        'Address not available'}
                                </p>
                                {location.formatted_city && (
                                    <p className="text-sm text-gray-400">
                                        {location.formatted_city}
                                    </p>
                                )}
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SearchResult
