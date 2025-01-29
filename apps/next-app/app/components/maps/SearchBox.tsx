import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    FaFire,
    FaLocationCrosshairs,
    FaMagnifyingGlass,
    FaXmark,
} from 'react-icons/fa6'
import debounce from 'lodash.debounce'
import { FaArrowLeft } from 'react-icons/fa'

type AllowedComponentType = 'home' | 'detail'

type MapsPropsType = {}

type LocationStateType = {
    name: String
    address: String
}

const SearchBox: React.FC<MapsPropsType> = () => {
    const serchParams = useSearchParams()
    const emergencyType = serchParams.get('type')
    const [isSearchBoxActive, setIsSearchBoxActive] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [locationResult, setLocationResult] = useState<LocationStateType[]>(
        []
    )

    const [currentUserAddress, setCurrentUserAddress] = useState('')

    return (
        <form>
            <div className="px-2 mt-4 absolute w-full z-[3] items-center mx-auto">
                <div
                    className={`${isSearchBoxActive ? 'rounded-xl rounded-b-none border border-gray-100' : 'rounded-full'}  shadow-sm border border-gray-100 rounded-full relative gap-1 items-center bg-white  text-gray-900 text-sm focus:ring-none focus:border-1 focus:border-gray-100 focus:outline-none flex w-full p-0`}
                >
                    <button
                        type="button"
                        className="flex items-center justify-center w-12 h-9 ml-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                    >
                        <FaMagnifyingGlass className="text-gray-600 text-[17px]" />
                    </button>
                    <input
                        type="text"
                        value={currentUserAddress}
                        onChange={(e) => {
                            handleSearchInputChange(e)
                        }}
                        onClick={(e) => {
                            handleSearchBoxOnFocus(e)
                        }}
                        className={`  text-gray-900 text-sm border-none focus:ring-none focus:border-none focus:outline-none block w-full p-3 px-0`}
                        placeholder="Cari lokasi, desa atau daerah terdekat"
                    />

                    {isSearchBoxActive && currentUserAddress && (
                        <button
                            type="button"
                            onClick={() => {
                                handleRemoveSelectedAddress()
                            }}
                            className="flex items-center justify-center w-12 h-9 me-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                        >
                            <FaXmark className="text-gray-600 text-[17px]" />
                        </button>
                    )}

                    {!isSearchBoxActive && (
                        <button
                            type="button"
                            onClick={(e) => {
                                handleOnGeolocate(e)
                            }}
                            className="flex items-center justify-center w-12 h-9 me-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                        >
                            <FaLocationCrosshairs className="text-gray-600 text-[17px]" />
                        </button>
                    )}
                </div>

                {isSearchBoxActive && (
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
                )}
            </div>
        </form>
    )
}

export default SearchBox
