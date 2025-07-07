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

        // getCurrentLocation((location: any) => {
        //     const coordinates = {
        //         lat: location.lat,
        //         long: location.lng,
        //     }
        //     updateCoordinate(location.lat, location.lng)
        //     rebuildMap()

        //     // get address info to update address on the textbox - [NOTE: Directly use location.service fetcher]
        //     getAddressInfo(coordinates.long, coordinates.lat).then((res) => {
        //         const address = res[0]?.place_name
        //         setCurrentUserAddress(address)
        //     })
        // })
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
        <form>
            <div className="px-1.5">
                <div
                    className={`gap-1 text-gray-800 flex items-center w-full p-0`}
                >
                    <div className="cursor-pointer flex gap-1 input-wrapper text-gray-900 bg-gray-100 rounded-[10px] py-2.5 text-sm px-3 border-none focus:ring-none focus:border-none focus:outline-none w-full">
                        <div>
                            <Icon
                                name="ph:magnifying-glass"
                                className="text-lg"
                            />
                        </div>
                        <input
                            type="text"
                            value={currentUserAddress}
                            className="p-0 w-full bg-gray-100 focus:border-none focus:ring-none focus:outline-none cursor-pointer"
                            placeholder="Cari lokasi, desa atau daerah terdekat"
                            onClick={handleSearchBoxClick}
                        />
                    </div>
                    <button
                        onClick={(e) => {
                            handleGetCurrentLocation(e)
                        }}
                        className="p-1 py-[10px] px-2 bg-gray-100 rounded-lg"
                    >
                        <Icon
                            name="material-symbols:my-location"
                            className="text-xl"
                        />
                    </button>
                </div>
            </div>
        </form>
    )
}

export default PreviewSearchBox
