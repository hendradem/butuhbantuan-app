'use client'
import React, { useState, useEffect } from 'react'
import useUserLocationData from '@/store/useUserLocationData'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getAddressInfo } from '@/store/api/services/location.service'
import useMapBox from '@/store/useMapBox'
import useSearchSheet from '@/store/useSearchSeet'
import Icon from '../../ui/Icon'

const PreviewSearchBox = () => {
    const searchSheet = useSearchSheet()
    const { fullAddress } = useUserLocationData()
    const { onRebuild: rebuildMap } = useMapBox()
    const { updateCoordinate, getAndSetCurrentLocation } = useUserLocationData()
    const [currentUserAddress, setCurrentUserAddress] = useState<string>('')

    const handleGetCurrentLocation = (e: any): void => {
        e.preventDefault()
        getAndSetCurrentLocation()
        rebuildMap()
    }

    const handleSearchBoxClick = () => {
        searchSheet.onOpen()
    }

    useEffect(() => {
        if (fullAddress === '') {
            setCurrentUserAddress('loading...')
        } else {
            setCurrentUserAddress(fullAddress)
        }
    }, [fullAddress])

    return (
        <div>
            <div className="search-box relative w-full">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <Icon
                        name="ph:magnifying-glass"
                        className="text-xl text-gray-400"
                    />
                </div>
                <div
                    className="searchbox cursor-pointer"
                    onClick={handleSearchBoxClick}
                >
                    {currentUserAddress}
                </div>
                <div className="absolute inset-y-0 end-0 flex items-center mx-2">
                    <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
                    >
                        <Icon
                            name="line-md:my-location-loop"
                            className="text-neutral-500 text-xl"
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PreviewSearchBox
