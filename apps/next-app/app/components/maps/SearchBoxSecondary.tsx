import React, { useState, useMemo, useEffect } from 'react'
import debounce from 'lodash.debounce'
import useUserLocationData from '@/app/store/useUserLocationData'
import { useAddressLocation } from '@/app/store/api/location.api'
import services from '../../store/data/services.json'
import { FaFire } from 'react-icons/fa'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import Icon from '../ui/Icon'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
    searchBoxIsClicked: () => void
    resetBottomSheet: () => void
}

type LocationStateType = {
    name: String
    address: String
    lat: number
    long: number
    urban_village: String
    subdistrict: String
    regency: String
    province: String
    district: String
    county: String
    city: string
    state: string
    formatted_city: string
}

const SearchBoxSecondary: React.FC<MapsPropsType> = ({
    rebuildMap,
    searchBoxIsClicked,
    resetBottomSheet,
}) => {
    const mainBottomSheet = useMainBottomSheet()
    const isFullScreen = mainBottomSheet.isFullScreen
    const userAddress = useUserLocationData((state) => state.fullAddress)
    const onExitFullScreen = mainBottomSheet.onExitFullScreen
    const updateCoordinate = useUserLocationData(
        (state) => state.updateCoordinate
    )
    const updateRefetchMatrix = useUserLocationData(
        (state) => state.updateRefetchMatrix
    )

    const [isSearchBoxActive, setIsSearchBoxActive] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [locationAddressQuery, setLocationAddressQuery] = useState<string>('')
    const [locationResult, setLocationResult] = useState([])
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
        setIsSearchBoxActive(false)
        setCurrentUserAddress('')
    }

    const handleResetBottomSheet = (e: any): void => {
        e.preventDefault()
        resetBottomSheet()
        setIsSearchBoxActive(false)
        onExitFullScreen()
        // setLocationResult([])
    }

    const handleGetCurrentLocation = (e: any): void => {
        e.preventDefault()
        getCurrentLocation((location: any) => {
            const coordinates = {
                lat: location.lat,
                long: location.lng,
            }
            updateCoordinate(location.lat, location.lng)
            rebuildMap('rebuild', coordinates) // trigger map rebuild function at parent component
        })
    }

    const handleSelectedAddress = (address: any, e: any): void => {
        e.preventDefault()
        resetBottomSheet()
        setIsSearchBoxActive(false)
        setCurrentUserAddress(address.address)
        const coordinates = { lat: address.lat, long: address.long }
        updateCoordinate(address.lat, address.long)
        updateRefetchMatrix()
        onExitFullScreen()
    }
    const handleSearchBoxOnFocus = (): void => {
        setIsSearchBoxActive(true)
        searchBoxIsClicked()
    }

    useEffect(() => {
        if (userAddress) {
            setCurrentUserAddress(userAddress)
        } else {
            setCurrentUserAddress('')
        }
    }, [userAddress])

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
                    name: item?.properties?.name,
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

            setLocationResult(temp)
            setIsLoading(false)
        }
    }, [searchAddressResult])

    useEffect(() => {
        if (currentUserAddress === '') {
            setLocationResult([])
            setIsLoading(false)
        }
    }, [currentUserAddress])

    return (
        <form>
            <div className="px-1.5">
                <div
                    className={`gap-1 text-gray-800 flex items-center w-full p-0`}
                >
                    <div className="flex gap-1 input-wrapper text-gray-900 bg-gray-100 rounded-[10px] p-2 text-sm px-3 border-none focus:ring-none focus:border-none focus:outline-none w-full">
                        <input
                            type="text"
                            value={currentUserAddress}
                            onChange={(e) => {
                                handleSearchInputChange(e)
                            }}
                            onClick={() => {
                                handleSearchBoxOnFocus()
                            }}
                            className="p-0 w-full bg-gray-100 focus:border-none focus:ring-none focus:outline-none"
                            placeholder="Cari lokasi, desa atau daerah terdekat"
                        />
                        {isFullScreen && (
                            <button
                                onClick={(e) => {
                                    handleRemoveSearchValue(e)
                                }}
                                className="p-1 ml-1 bg-gray-200 rounded-full"
                            >
                                <Icon name="material-symbols:close-rounded" />
                            </button>
                        )}
                    </div>
                    {isFullScreen && (
                        <button
                            onClick={(e) => {
                                handleResetBottomSheet(e)
                            }}
                            className="p-1 py-[5px] bg-gray-100 rounded-xl"
                        >
                            <Icon
                                name="material-symbols:keyboard-arrow-down-rounded"
                                className="text-2xl text-gray-700"
                            />
                        </button>
                    )}
                    {!isFullScreen && (
                        <button
                            onClick={(e) => {
                                handleGetCurrentLocation(e)
                            }}
                            className="p-1 py-[8px] bg-gray-100 rounded-md"
                        >
                            <Icon
                                name="iconamoon:location-bold"
                                className="text-xl"
                            />
                        </button>
                    )}
                </div>

                {isFullScreen && locationResult?.length == 0 && !isLoading && (
                    <div>
                        <div className="default  flex items-center justify-center my-3">
                            <div className="p-2 border rounded-lg border-gray-200">
                                <Icon
                                    name="material-symbols:search"
                                    className="text-2xl text-gray-900"
                                />
                            </div>
                        </div>
                        <h3 className="text-center text-[14.5px] mt-2 text-neutral-600 font-medium">
                            Cari lokasi terdekatmu
                        </h3>
                        <h3 className="text-center mx-3 text-[14px] text-neutral-500 font-normal">
                            Cari lokasimu dengan nama jalan, nama desa, atau
                            nama tempat terdekatmu
                        </h3>
                    </div>
                )}

                {isLoading && (
                    <div className="w-full mt-2 text-neutral-800 py-2">
                        <div className="flex flex-col gap-2">
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                        </div>
                    </div>
                )}

                {!isLoading &&
                    locationResult.length !== 0 &&
                    isSearchBoxActive && (
                        <div className="w-full mt-4 bg-white text-neutral-800">
                            {locationResult?.map(
                                (item: LocationStateType, index) => {
                                    return (
                                        <div
                                            key={index}
                                            className="w-full flex items-center gap-3 text-neutral-800 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer"
                                            onClick={(e) => {
                                                handleSelectedAddress(item, e)
                                            }}
                                        >
                                            <p className="text-md">
                                                <FaMagnifyingGlass />
                                            </p>
                                            <div className="w-full truncate">
                                                <p className="font-normal text-[14.5px] leading-none m-0 p-0 w-full truncate">
                                                    {item?.name}
                                                </p>
                                                <p className="m-0 p-0 leading-none mt-1 text-[13px] w-full truncate text-neutral-400">
                                                    {item?.formatted_city}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    )}
            </div>
        </form>
    )
}

export default SearchBoxSecondary
