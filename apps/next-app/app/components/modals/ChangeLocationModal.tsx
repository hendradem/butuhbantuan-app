'use client'
import useModal from '@/app/store/useModal'
import React, { useEffect, useRef, useMemo } from 'react'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { HiMiniXMark, HiMapPin } from 'react-icons/hi2'
import Skeleton from 'react-loading-skeleton'
import debounce from 'lodash.debounce'

import useUserLocationData from '@/app/store/useUserLocationData'

const ChangeLocationModal = () => {
    type LocationState = {
        name: String
        address: String
    }

    const { isChangeLocationModalOpen, updateChangeLocationModal } = useModal()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [locationValue, setLocationValue] = useState<string>('')
    const [locationResult, setLocationResult] = useState<LocationState[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(true)

    const updateCoordinate = useUserLocationData(
        (state) => state.updateUserCoordinate
    )

    const debouncedResult = useMemo(() => {
        // add search debounce effect
        return debounce((e: any) => searchUserLocation(e), 1000)
    }, [])
    const searchUserLocation = (e: any) => {
        // handle value changes from debounce func
        setLocationValue(e.target.value)
    }

    const searchData = () => {
        setIsLoading(true)

        var requestOptions = {
            method: 'GET',
        }

        fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${locationValue}&apiKey=8039083723464cb389ed3d1f4bd86d35`,
            requestOptions
        )
            .then((response) => response.json())
            .then((result) => {
                let temp: any = []
                result?.features.map((item: any) => {
                    const data = {
                        name: item?.properties?.name,
                        address: item?.properties?.formatted,
                        lat: item?.properties?.lat,
                        long: item?.properties?.lon,
                    }
                    temp.push(data)
                })
                setLocationResult(temp)
                setIsLoading(false)
            })
            .catch((error) => console.log('error', error))
    }

    const handleAddressClick = (addressDetail: any): void => {
        console.log('latitude: ' + addressDetail.lat)
        console.log('longitude: ' + addressDetail.long)
        // updateCoordinate({ lat: addressDetail.lat, long: addressDetail.long });
    }

    useEffect(() => {
        if (locationResult !== null) {
            searchData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationValue])

    useEffect(() => {
        if (!locationValue) {
            setLocationResult([])
        }
    }, [locationValue])

    return (
        <>
            <Dialog
                open={isChangeLocationModalOpen}
                onClose={() => {
                    setIsOpen(false)
                }}
                className="relative z-50"
            >
                <div className="fixed inset-0 w-screen bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="w-[500px] p-4 overflow-x-hidden overflow-y-auto">
                        <div className="relative bg-white rounded-lg shadow ">
                            <div className="flex items-center justify-between px-4 py-3 border-b rounded-t ">
                                <h3 className="text-md font-medium text-gray-900">
                                    Cari lokasi anda
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateChangeLocationModal(false)
                                    }}
                                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                                    data-modal-hide="large-modal"
                                >
                                    <HiMiniXMark className="text-lg" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <form>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                            <HiMapPin className="text-lg text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-3 "
                                            placeholder="Cari lokasi terdekat"
                                            onChange={debouncedResult}
                                        />
                                    </div>
                                    {isLoading ? (
                                        <div className="h-[350px] mt-2 ">
                                            <Skeleton
                                                className="my-0"
                                                count={4}
                                                height={80}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className={`text-gray-400 mt-2 relative overflow-y-scroll ${
                                                locationValue
                                                    ? 'h-[350px]'
                                                    : 'h-[50px]'
                                            }`}
                                        >
                                            {locationResult?.map(
                                                (item, index) => {
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`bg-white cursor-pointer hover:bg-gray-50 w-full border border-gray-200 p-2.5 ${
                                                                index === 0
                                                                    ? 'rounded-t-lg'
                                                                    : index ===
                                                                        locationResult.length -
                                                                            1
                                                                      ? 'rounded-b-lg'
                                                                      : ''
                                                            }`}
                                                            onClick={() => {
                                                                handleAddressClick(
                                                                    item
                                                                )
                                                            }}
                                                        >
                                                            <span className="text-gray-700">
                                                                {item?.name}
                                                            </span>
                                                            <span className="text-gray-400 text-[14px] ml-1">
                                                                {item?.address}
                                                            </span>
                                                        </div>
                                                    )
                                                }
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    )
}

export default ChangeLocationModal
