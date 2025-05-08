import React, { ReactHTMLElement, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Icon from '../ui/Icon'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useResultSheet from '@/app/store/useResultSheet'
import useEmergencyData from '@/app/store/useEmergencyData'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import { HiCheckBadge, HiClock, HiMapPin, HiMiniPhone } from 'react-icons/hi2'
import { RiMessage3Line } from 'react-icons/ri'

const Resultsheet = () => {
    const resultSheet = useResultSheet()
    const mainBottomSheet = useMainBottomSheet()
    const selectedEmergencyData: any = useEmergencyData(
        (state) => state.selectedEmergencyData
    )
    const updateDirectionRoute = useMapBox(
        (action) => action.updateDirectionRoute
    )
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const emergencyData = useEmergencyData((state) => state.emergencyData)
    const userLocationLatitude = useUserLocationData((state) => state.lat)
    const userLocationLongitude = useUserLocationData((state) => state.long)
    const [selectedEmergency, setSelectedEmergency] = useState<string>('')
    const [orderedEmergencyData, setOrderedEmergencyData] = useState<[]>([])

    console.log(emergencyData)

    const handleSelectedEmergency = async (emergency: any) => {
        setSelectedEmergency(emergency.name)

        const directions = await getDirectionsRoute(
            [emergency.coordinates[0], emergency.coordinates[1]], // origin coordinate (emergency location)
            [userLocationLongitude, userLocationLatitude] // user location coordinate
        )

        updateDirectionRoute(directions)
    }

    const orderByDuration = (): void => {
        setSelectedEmergency('')
        const orderedData = emergencyData?.sort(
            (a: any, b: any) =>
                a?.responseTime?.duration - b?.responseTime?.duration
        )

        setOrderedEmergencyData(orderedData)
    }

    const parseResponseTime = (duration: number): JSX.Element => {
        const maxResponseTime: number = 25

        return (
            <>
                {duration <= maxResponseTime ? (
                    <div className="flex items-center">
                        <HiClock className="mr-1" />
                        <span> {Math.floor(+duration)} </span>
                        <span className="ml-1">menit</span>
                    </div>
                ) : (
                    <span> {duration} </span>
                )}
            </>
        )
    }

    const badgeClassesByDuration = (duration: number): string => {
        if (duration !== 0) {
            if (duration <= 15) {
                return 'bg-green-100 text-green-800'
            } else if (duration >= 15 && duration <= 20) {
                return 'bg-orange-100 text-orange-800'
            } else if (duration > 20 && duration <= 25) {
                return 'bg-red-100 text-red-800'
            } else {
                return 'bg-black text-white'
            }
        } else {
            return ''
        }
    }

    const handleChangeLocationOnClick = (): void => {
        mainBottomSheet.onFullScreen()
    }

    // useEffect(() => {
    //     orderByDuration()
    // }, [emergencyData])

    return (
        <div className="bottom-sheet">
            <BottomSheet
                open={resultSheet.isOpen}
                ref={sheetRef}
                snapPoints={({ maxHeight, minHeight }) => [
                    maxHeight - maxHeight / 10,
                    minHeight + 2,
                ]}
                blocking={false}
            >
                <div className="sheet-wrapper">
                    <div className="sheet-header border-b p-2 px-3 border-neutral-200 flex justify-between">
                        <div className="flex gap-2 items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full bg-${selectedEmergencyData?.colorSecondary} `}
                            >
                                <Icon
                                    name={selectedEmergencyData?.icon}
                                    className={`text-${selectedEmergencyData.colorMain} text-xl`}
                                />
                            </div>
                            <div>
                                <h1 className="text-lg leading-none m-0 text-neutral-800 font-semibold">
                                    {selectedEmergencyData?.name}
                                </h1>
                                <p className="m-0 text-[14px] text-neutral-500">
                                    {emergencyData?.length} hasil ditemukan.
                                    <span
                                        className="text-blue-500 ml-1 font-medium cursor-pointer"
                                        onClick={() =>
                                            handleChangeLocationOnClick()
                                        }
                                    >
                                        Ganti lokasi
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => resultSheet.setOpen(false)}
                            type="button"
                            className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                        >
                            <Icon
                                name="ion:close"
                                className="text-neutral-600 text-xl"
                            />
                        </button>
                    </div>
                    <div className="search-result-wrapper max-h-[300px] overflow-y-scroll">
                        <div className="mt-5">
                            {emergencyData &&
                                emergencyData?.map(
                                    (
                                        emergency: any,
                                        emergencyIndex: number
                                    ) => {
                                        return (
                                            <ul
                                                key={emergency.id}
                                                className={`list-wrapper py-2 cursor-pointer border-neutral-100 ${emergencyIndex == 0 ? 'border-t border-b' : 'border-b'} `}
                                                onClick={() => {
                                                    handleSelectedEmergency(
                                                        emergency
                                                    )
                                                }}
                                            >
                                                <li className="white">
                                                    <div className="flex items-center space-x-4 py-2 px-3">
                                                        <div className="bg-white rounded-xl">
                                                            <Image
                                                                alt="Organization logo"
                                                                width={40}
                                                                height={40}
                                                                src={
                                                                    emergency.logo
                                                                }
                                                            />
                                                        </div>
                                                        <div className="flex-1 leading-tight min-w-0">
                                                            <div className="flex items-center">
                                                                <p className="text-md font-semibold text-gray-900 truncate">
                                                                    {
                                                                        emergency.name
                                                                    }
                                                                </p>

                                                                <HiCheckBadge className="text-blue-500 ml-1" />
                                                            </div>
                                                            <span className="text-[13px] font-normal my-0 text-gray-600">
                                                                {
                                                                    emergency.organization
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="space-x-1">
                                                            <div>
                                                                <span
                                                                    className={` badge text-[10px] badge-icon border-0 shadow-none ${badgeClassesByDuration(emergency?.responseTime?.duration)}`}
                                                                >
                                                                    {parseResponseTime(
                                                                        emergency
                                                                            ?.responseTime
                                                                            ?.duration
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedEmergency ===
                                                        emergency.name && (
                                                        <div className="w-full p-2 px-3">
                                                            <div className="flex space-x-2">
                                                                <button className="button flex items-center justify-center w-full p-2 px-4 shadow-sm">
                                                                    <RiMessage3Line
                                                                        size={
                                                                            18
                                                                        }
                                                                        className="mr-2"
                                                                    />
                                                                    <span className="hidden md:block">
                                                                        WhatsApp
                                                                    </span>
                                                                    <span className="md:hidden">
                                                                        WA
                                                                    </span>
                                                                </button>
                                                                <button className="button flex items-center justify-center w-full p-2 px-4 text-white bg-black hover:bg-black hover:text-white">
                                                                    <HiMiniPhone
                                                                        size={
                                                                            18
                                                                        }
                                                                        className="mr-2"
                                                                    />
                                                                    Telfon
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            </ul>
                                        )
                                    }
                                )}
                        </div>
                    </div>
                </div>
            </BottomSheet>
        </div>
    )
}

export default Resultsheet
