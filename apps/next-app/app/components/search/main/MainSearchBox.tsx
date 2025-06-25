'use client'
import React, { useState, useMemo, useEffect } from 'react'
import debounce from 'lodash.debounce'
import useUserLocationData from '@/app/store/useUserLocationData'
import { useAddressLocation } from '@/app/store/api/location.api'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import { getAddressInfo } from '@/app/store/api/services/location.service'
import useSearchSheet from '@/app/store/useSearchSeet'
import useSearchData from '@/app/store/useSearchData'
import SearchResult from '@/app/components/bottomsheet/search/partials/SearchResult'
import Icon from '../../ui/Icon'

const MainSearchBox = () => {
    const { onSnap, onClose } = useSearchSheet()
    const { searchResults, setSearchResults, isLoading, setIsLoading } =
        useSearchData()
    const { fullAddress, updateCoordinate, updateRefetchMatrix } =
        useUserLocationData()

    const [isSearchBoxActive, setIsSearchBoxActive] = useState<boolean>(false)
    const [locationAddressQuery, setLocationAddressQuery] = useState<string>('')
    const [currentUserAddress, setCurrentUserAddress] = useState<string>('')

    const {
        data: searchAddressResult,
        refetch: refetchSearchAddress,
        isLoading: searchAddressLoading,
    } = useAddressLocation(locationAddressQuery)

    const handleSearchInputChange = (e: any): void => {
        setCurrentUserAddress(e.target.value)
        debouncedResult(e)
        if (currentUserAddress) {
            setIsLoading(true)
        }
    }
    const debouncedResult = useMemo(() => {
        return debounce((e: any) => searchUserLocation(e), 1000)
    }, [])

    const searchUserLocation = (e: any) => {
        setLocationAddressQuery(e.target.value)
    }

    const handleRemoveSearchValue = (e: any): void => {
        e.preventDefault()
        setCurrentUserAddress('')
        setSearchResults([])
        setIsLoading(false)
        setIsSearchBoxActive(true)
    }

    const handleGetCurrentLocation = (e: any): void => {
        e.preventDefault()
        getCurrentLocation((location: any) => {
            const coordinates = {
                lat: location.lat,
                long: location.lng,
            }
            updateCoordinate(location.lat, location.lng)
            // rebuildMap('rebuild', coordinates) // trigger map rebuild function at parent component

            // get address info to update address on the textbox - [NOTE: Directly use location.service fetcher]
            getAddressInfo(coordinates.long, coordinates.lat).then((res) => {
                const address = res[0]?.place_name
                setCurrentUserAddress(address)
            })
        })
    }

    const handleSelectedAddress = (address: any, e: any): void => {
        e.preventDefault()

        setCurrentUserAddress(address.address)
        updateCoordinate(address.lat, address.long)
        updateRefetchMatrix()
        onClose() // close search sheet
    }
    const handleSearchBoxOnFocus = (): void => {
        setIsSearchBoxActive(true)
        onSnap(0)
    }

    useEffect(() => {
        if (fullAddress) {
            setCurrentUserAddress(fullAddress)
        } else {
            setCurrentUserAddress('')
        }
    }, [fullAddress])

    useEffect(() => {
        if (locationAddressQuery) refetchSearchAddress()
    }, [locationAddressQuery])

    useEffect(() => {
        if (!searchAddressLoading) {
            let temp: any = []
            searchAddressResult?.features?.map((item: any) => {
                const district = item.properties?.district
                    ? item.properties?.district
                    : item.properties?.city

                const city = item.properties?.state
                    ? item.properties?.state
                    : ''

                const formattedArea = `${district}, ${city}`

                const data = {
                    name: item?.properties?.name
                        ? item?.properties?.name
                        : 'name not found',
                    address: item?.properties?.formatted,
                    lat: item?.properties?.lat,
                    long: item?.properties?.lon,
                    district: item?.properties?.district,
                    place_name: item?.properties?.name,
                    urban_village: item?.properties?.suburb,
                    county: item?.properties?.county,
                    formatted_city: formattedArea,
                }
                temp.push(data)
            })

            // setLocationResult(temp)
            setSearchResults(temp)
            setIsLoading(false)
        }
    }, [searchAddressResult])

    useEffect(() => {
        if (currentUserAddress === '') {
            setSearchResults([])
            setIsLoading(false)
        }
    }, [currentUserAddress])

    return (
        <form className="border-none bg-transparent rounded-xl">
            <div className="search-box relative w-full mt-1">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <Icon
                        name="ph:magnifying-glass"
                        className="text-xl text-gray-500"
                    />
                </div>
                <input
                    type="text"
                    value={currentUserAddress}
                    onChange={(e) => {
                        handleSearchInputChange(e)
                    }}
                    onClick={() => {
                        handleSearchBoxOnFocus()
                    }}
                    className={`bg-white border border-gray-300 text-gray-900 text-sm 
                        rounded-xl focus:ring-none focus:border focus:border-gray-300 
                        focus:outline-none block w-full px-9 pr-[70px] p-2.5
                        ${isSearchBoxActive || SearchResult.length > 0 ? '!border-b-0 !rounded-b-none' : ''}`}
                    placeholder="Cari lokasi, desa atau daerah terdekat"
                />
                <div className="absolute inset-y-0 end-0 flex items-center mr-2">
                    {currentUserAddress && (
                        <button
                            onClick={(e) => {
                                handleRemoveSearchValue(e)
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100"
                        >
                            <Icon
                                name="material-symbols:close"
                                className="text-neutral-600"
                            />
                        </button>
                    )}
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100"
                    >
                        <Icon
                            name="iconamoon:location"
                            className="text-neutral-600 text-xl"
                        />
                    </button>
                </div>
            </div>

            <SearchResult
                locationResult={searchResults}
                isLoading={isLoading}
                handleSelectedAddress={handleSelectedAddress}
            />
        </form>
    )
}

export default MainSearchBox
