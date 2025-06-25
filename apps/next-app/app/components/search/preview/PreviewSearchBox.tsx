'use client'
import React, { useState, useEffect } from 'react'
import useUserLocationData from '@/app/store/useUserLocationData'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import { getAddressInfo } from '@/app/store/api/services/location.service'
import useMapBox from '@/app/store/useMapBox'
import useSearchSheet from '@/app/store/useSearchSeet'
import Icon from '../../ui/Icon'

const PreviewSearchBox = () => {
    const { fullAddress: userAddress } = useUserLocationData()
    const searchSheet = useSearchSheet()
    const { onRebuild: rebuildMap } = useMapBox()
    const { updateCoordinate } = useUserLocationData()
    const [currentUserAddress, setCurrentUserAddress] = useState<string>('')

    const handleGetCurrentLocation = (e: any): void => {
        e.preventDefault()
        getCurrentLocation((location: any) => {
            const coordinates = {
                lat: location.lat,
                long: location.lng,
            }
            updateCoordinate(location.lat, location.lng)
            rebuildMap()

            // get address info to update address on the textbox - [NOTE: Directly use location.service fetcher]
            getAddressInfo(coordinates.long, coordinates.lat).then((res) => {
                const address = res[0]?.place_name
                setCurrentUserAddress(address)
            })
        })
    }

    const handleSearchBoxClick = () => {
        searchSheet.onOpen()
    }

    useEffect(() => {
        if (userAddress === null) {
            setCurrentUserAddress('loading..')
        } else {
            setCurrentUserAddress(userAddress)
        }
    }, [userAddress])

    return (
        <form>
            <div className="px-1.5">
                <div
                    className={`gap-1 text-gray-800 flex items-center w-full p-0`}
                >
                    <div className="cursor-pointer flex gap-1 input-wrapper text-gray-900 bg-gray-100 rounded-[10px] p-2 text-sm px-3 border-none focus:ring-none focus:border-none focus:outline-none w-full">
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
                        className="p-1 py-[8px] px-2 bg-gray-100 rounded-lg"
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
