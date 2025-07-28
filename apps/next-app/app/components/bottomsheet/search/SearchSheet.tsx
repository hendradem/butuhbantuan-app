'use client'
import React, { useState } from 'react'
import CoreSheet from '../core/CoreSheet'
import useSearchSheet from '@/store/useSearchSeet'
import useSearchData from '@/store/useSearchData'
import useUserLocationData from '@/store/useUserLocationData'
import HeaderSection from './partials/HeaderSection'
import SearchBox from '@/components/search/main/MainSearchBox'
import SearchResult from './partials/SearchResult'
import InfoState from '@/components/commons/InfoState'

const SearchSheet = () => {
    const { isOpen, snapPoint, onClose } = useSearchSheet()
    const {
        searchResults,
        isLoading,
        isActive: isSearchBoxActive,
        setIsActive: setIsSearchBoxActive,
        updateSearchCoordinate,
    } = useSearchData()
    const { updateFullAddress } = useUserLocationData()
    const snapPoints = [500, 0]
    const handleSearchBoxFocus = () => {}
    const handleAddressSelect = (address: any) => {
        updateFullAddress(address.address)
        updateSearchCoordinate(address.lat, address.long)
        setIsSearchBoxActive(false) // set searchbox status to inactive
        onClose()
    }
    const renderInfoState =
        !isSearchBoxActive && !isLoading && searchResults.length === 0
    const renderNotFoundSearchButton =
        snapPoint === 1 && !isLoading && searchResults.length >= 1

    return (
        <div data-testid="search-sheet" className="bottom-sheet">
            <CoreSheet
                isOpen={isOpen}
                header={<HeaderSection />}
                snapPoints={snapPoints}
                initialSnap={0}
                isOverlay
                draggable={false}
                scrollable={false}
            >
                <div className="sheet-content h-full overflow-y-scroll">
                    <div className="heading sticky">
                        <div className="mb-2 px-3">
                            <SearchBox
                                onFocus={handleSearchBoxFocus}
                                onAddressSelect={handleAddressSelect}
                                placeholder="Cari lokasi, desa atau daerah terdekat"
                                showLocationButton={true}
                            />
                        </div>
                    </div>

                    <div className="content max-h-[80%] overflow-y-scroll">
                        <>
                            <div className="info-state">
                                {renderInfoState && (
                                    <InfoState
                                        size="xs"
                                        title="Cari bantuan di sekitarmu"
                                        description="Cari nama tempat, nama jalan, atau nama lokasi terdekatmu. Akan kami carikan bantuan"
                                    />
                                )}
                            </div>

                            {/* Search Results Component */}
                            {!isLoading && (
                                <SearchResult
                                    locationResult={searchResults}
                                    handleSelectedAddress={handleAddressSelect}
                                />
                            )}

                            {/* Loading State */}
                            {isLoading && (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-sm text-gray-500">
                                        Searching...
                                    </p>
                                </div>
                            )}

                            {renderNotFoundSearchButton && (
                                <div className="pb-8 px-3">
                                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-md">
                                        Lokasi tidak ditemukan? Cari di Maps
                                    </button>
                                </div>
                            )}
                        </>
                    </div>
                </div>
            </CoreSheet>
        </div>
    )
}

export default SearchSheet
