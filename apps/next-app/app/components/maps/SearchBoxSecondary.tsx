import React, { useState, useMemo, useEffect } from 'react'
import debounce from 'lodash.debounce'
import useUserLocationData from '@/app/store/useUserLocationData'
import { useAddressLocation } from '@/app/store/api/location.api'
import services from '../../store/data/services.json'
import { FaFire } from 'react-icons/fa'
import { FaMagnifyingGlass } from 'react-icons/fa6'
import Icon from '../ui/Icon'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
    searchBoxIsClicked: () => void
    resetBottomSheet: () => void
}

type LocationStateType = {
    name: String
    address: String
}

const SearchBoxSecondary: React.FC<MapsPropsType> = ({
    rebuildMap,
    searchBoxIsClicked,
    resetBottomSheet,
}) => {
    const userAddress = useUserLocationData((state) => state.fullAddress)
    const updateCoordinate = useUserLocationData(
        (state) => state.updateCoordinate
    )
    const updateRebuildMap = useUserLocationData(
        (state) => state.updateRebuildMap
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
        setCurrentUserAddress('')
        resetBottomSheet()
    }
    const handleSelectedAddress = (address: any): void => {
        const coordinates = { lat: address.lat, long: address.long }
        updateCoordinate(address.lat, address.long)
        rebuildMap('rebuild', coordinates) // trigger map rebuild function at parent
        setIsSearchBoxActive(false)
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
                const data = {
                    name: item?.properties?.name,
                    address: item?.properties?.formatted,
                    lat: item?.properties?.lat,
                    long: item?.properties?.lon,
                    district: item?.properties?.district,
                    place_name: item?.properties?.name,
                    urban_village: item?.properties?.suburb,
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
            <div>
                <div
                    className={`${isSearchBoxActive ? 'rounded-xl rounded-b-none ' : 'rounded-full'}  shadow-sm border border-gray-100 rounded-full relative gap-1 items-center bg-white  text-gray-900 text-sm focus:ring-none focus:border-1 focus:border-gray-100 focus:outline-none flex w-full p-0`}
                >
                    <input
                        type="text"
                        value={currentUserAddress}
                        onChange={(e) => {
                            handleSearchInputChange(e)
                        }}
                        onClick={() => {
                            handleSearchBoxOnFocus()
                        }}
                        className={`  text-gray-900 bg-gray-100 rounded-[10px] p-2 text-sm px-3 border-none focus:ring-none focus:border-none focus:outline-none block w-full `}
                        placeholder="Cari lokasi, desa atau daerah terdekat"
                    />
                    <button
                        onClick={(e) => {
                            handleRemoveSearchValue(e)
                        }}
                        className="p-2 py-2.5 bg-gray-100 rounded-md"
                    >
                        <Icon name="material-symbols:close-rounded" />
                    </button>
                </div>

                {isSearchBoxActive &&
                    locationResult?.length == 0 &&
                    !isLoading && (
                        <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                            <div>
                                <div className="default  flex items-center justify-center">
                                    <div className="p-2 border rounded-lg border-gray-200">
                                        <FaFire />
                                    </div>
                                </div>
                                <h3 className="text-center text-[14.5px] mt-2 font-medium">
                                    Cari lokasi terdekatmu
                                </h3>
                                <h3 className="text-center mx-3 text-[14px] text-neutral-500 mt-1 font-normal">
                                    Cari lokasimu dengan nama jalan, nama desa,
                                    atau nama tempat terdekatmu
                                </h3>

                                <div className="mt-5 grid grid-cols-4 items-start">
                                    {services?.map(
                                        (service: any, index: number) => (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    alert(index)
                                                }}
                                                className="flex flex-col cursor-pointer items-center justify-center"
                                            >
                                                <div
                                                    className={`p-2 border-none rounded-lg bg-${service?.colorSecondary}`}
                                                >
                                                    <Icon
                                                        name={service?.icon}
                                                        className={`text-${service?.colorMain} text-[28px]`}
                                                    />
                                                </div>
                                                <div className="mx-3">
                                                    <h3 className="text-center text-[11px] mt-1 text-neutral-600 font-medium leading-[1.3]">
                                                        {service?.name}
                                                    </h3>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                {isLoading && (
                    <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
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
                        <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                            {locationResult?.map(
                                (item: LocationStateType, index) => {
                                    return (
                                        <div
                                            key={index}
                                            className="w-full flex items-center gap-2 text-neutral-800 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer"
                                            onClick={() => {
                                                handleSelectedAddress(item)
                                            }}
                                        >
                                            <p className="text-md">
                                                <FaMagnifyingGlass />
                                            </p>
                                            <p className="font-normal w-full truncate">
                                                {item.address}
                                            </p>
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
