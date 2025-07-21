'use client'
import React, { useState } from 'react'
import CoreSheet from '../core/CoreSheet'
import useSearchSheet from '@/store/useSearchSeet'
import useSearchData from '@/store/useSearchData'
import useUserLocationData from '@/store/useUserLocationData'
import HeaderSection from './partials/HeaderSection'
import SearchBox from '@/components/search/main/MainSearchBox'
import SearchResult from './partials/SearchResult'
import useEmergencyData from '@/store/useEmergencyData'
import NearestService from './partials/NearestService'
import InfoState from '@/components/commons/InfoState'
import Tabs from '@/components/ui/Tabs'

const SearchSheet = () => {
    const { isOpen, snapPoint, onClose } = useSearchSheet()
    const { emergencyData } = useEmergencyData()
    const {
        searchResults,
        isLoading,
        isActive: isSearchBoxActive,
        setIsActive: setIsSearchBoxActive,
        updateSearchCoordinate,
    } = useSearchData()
    const {
        fullAddress,
        updateFullAddress,
        updateCoordinate,
        updateRefetchMatrix,
    } = useUserLocationData()
    const [activeTab, setActiveTab] = useState(1)
    const snapPoints = [500, 0]

    const tabs = [
        {
            value: 1,
            title: 'All',
        },
        {
            value: 2,
            title: 'Bantuan terdekat',
        },
    ]

    const handleSearchBoxFocus = () => {}
    const handleAddressSelect = (address: any) => {
        updateFullAddress(address.address)
        updateSearchCoordinate(address.lat, address.long)
        setIsSearchBoxActive(false) // set searchbox status to inactive
        onClose()
    }

    const handleNearestServiceSelect = (location: any) => {
        console.log(location)

        // updateFullAddress(location.address)
        // updateCoordinate(location.lat, location.long)
        // updateRefetchMatrix()
    }

    const filterEmergencyData = emergencyData?.filter((data: any) => {
        return data.responseTime.duration <= 10
    })

    const renderInfoState =
        !isSearchBoxActive && !isLoading && searchResults.length === 0
    const renderNearestService =
        searchResults.length === 0 &&
        !isLoading &&
        filterEmergencyData &&
        !isSearchBoxActive
    const renderNotFoundSearchButton =
        snapPoint === 1 && !isLoading && searchResults.length >= 1

    return (
        <div>
            <div className="bottom-sheet">
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
                            <Tabs
                                tabs={tabs}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                children={null}
                            />
                        </div>

                        <div className="content max-h-[80%] overflow-y-scroll">
                            <div className="all-tab-content">
                                {activeTab === 1 && (
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
                                                handleSelectedAddress={
                                                    handleAddressSelect
                                                }
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
                                                    Lokasi tidak ditemukan? Cari
                                                    di Maps
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="nearest-service-tab-content">
                                {activeTab === 2 && renderNearestService && (
                                    <div className="px-3 mt-3 bg-white mb-8 overflow-hidden">
                                        <NearestService
                                            emergency={filterEmergencyData}
                                            handleSelect={
                                                handleNearestServiceSelect
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default SearchSheet
