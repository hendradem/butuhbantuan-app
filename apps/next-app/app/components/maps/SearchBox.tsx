import React, { useState, useMemo, useEffect } from 'react'
import useUserLocationData from '@/app/store/useUserLocationData'
import { FaMagnifyingGlass, FaX } from 'react-icons/fa6'
import debounce from 'lodash.debounce'
import { useAddressLocation } from '@/app/store/api/location.api'
import { FaFire } from 'react-icons/fa'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
}

type LocationStateType = {
    name: String
    address: String
}

const SearchBox: React.FC<MapsPropsType> = ({ rebuildMap }) => {
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

    const handleRemoveSearchValue = (): void => {
        setCurrentUserAddress('')
    }
    const handleSelectedAddress = (address: any): void => {
        const coordinates = { lat: address.lat, long: address.long }
        updateCoordinate(address.lat, address.long)
        rebuildMap('rebuild', coordinates) // trigger map rebuild function at parent
        setIsSearchBoxActive(false)
    }
    const handleSearchBoxOnFocus = (): void => {
        setIsSearchBoxActive(true)
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
            <div className="px-2 mt-4 absolute w-full z-[3] items-center mx-auto">
                <div
                    className={`${isSearchBoxActive ? 'rounded-xl rounded-b-none border border-gray-100' : 'rounded-full'}  shadow-sm border border-gray-100 rounded-full relative gap-1 items-center bg-white  text-gray-900 text-sm focus:ring-none focus:border-1 focus:border-gray-100 focus:outline-none flex w-full p-0`}
                >
                    <button
                        type="button"
                        className="flex items-center justify-center w-12 h-9 ml-1.5 rounded-full "
                    >
                        <FaMagnifyingGlass className="text-gray-600 text-[17px]" />
                    </button>
                    <input
                        type="text"
                        value={currentUserAddress}
                        onChange={(e) => {
                            handleSearchInputChange(e)
                        }}
                        onClick={() => {
                            handleSearchBoxOnFocus()
                        }}
                        className={`  text-gray-900 text-sm border-none focus:ring-none focus:border-none focus:outline-none block w-full p-3 px-0`}
                        placeholder="Cari lokasi, desa atau daerah terdekat"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            handleRemoveSearchValue()
                        }}
                        className="flex items-center justify-center w-12 h-9 me-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                    >
                        <FaX className="text-gray-600 text-[13px]" />
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
                            </div>
                        </div>
                    )}

                {isLoading && (
                    <div className="w-full bg-white mt-5 text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none px-2 py-4">
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
                        <div className="w-full bg-white mt-4 text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                            {locationResult?.map(
                                (item: LocationStateType, index) => {
                                    return (
                                        <div
                                            key={index}
                                            className="w-full mt-4 flex items-center gap-2 text-neutral-800 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer"
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

                {/* {isSearchBoxActive && (
                    <div className="result bg-white p-2 rounded-b-lg">
                        <p className="text-sm mb-1 font-normal text-neutral-600">
                            Hasil pencarian untuk{' '}
                            <span className="font-semibold">
                                {locationAddressQuery}
                            </span>
                        </p>

                        {locationResult?.length > 0 && !isLoading ? (
                            locationResult?.map(
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
                                                {item?.name}
                                            </p>
                                        </div>
                                    )
                                }
                            )
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            </div>
                        )}
                    </div>
                )} */}

                {/* {isSearchBoxActive && (
                    <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                        {!isLoading && locationResult.length === 0 && (
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
                                    Cari lokasimu dengan nama jalan, kelurahan,
                                    atau nama tempat terdekatmu
                                </h3>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col gap-2">
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            </div>
                        ) : (
                            locationResult?.length > 0 && (
                                <div className="result">
                                    <p className="text-sm mb-1 font-normal text-neutral-600">
                                        Cari {emergencyType} di sekitar
                                    </p>
                                    {locationResult?.map((item, index) => {
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
                                    })}
                                </div>
                            )
                        )}
                    </div>
                )} */}
            </div>
        </form>
    )
}

export default SearchBox
