import React, { useEffect, useState } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import useResultSheet from '@/app/store/useResultSheet'
import services from '@/app/store/data/services.json'
import useEmergencyData from '@/app/store/useEmergencyData'
import SearchBoxSecondary from '../maps/SearchBoxSecondary'
import Icon from '../ui/Icon'
import Image from 'next/image'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import { HiCheckBadge, HiClock, HiMapPin, HiMiniPhone } from 'react-icons/hi2'
import { RiMessage3Line } from 'react-icons/ri'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
}

type emergencyDataType = {
    colorSecondary: string
    colorMain: string
    icon: string
    name: string
}

const MainBottomMenu: React.FC<MapsPropsType> = ({ rebuildMap }) => {
    // states
    const resultSheet = useResultSheet()
    const mainBottomSheet = useMainBottomSheet()
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const onFullScreen = mainBottomSheet.onFullScreen
    const isSheetFullscreen = mainBottomSheet.isFullScreen
    const emergencyData = useEmergencyData((state) => state.emergencyData)

    const [selectedEmergencyData, setSelectedEmergencyData] =
        useState<emergencyDataType>()
    const [isDetail, setIsDetail] = useState(false)
    const handleSearchInputOnClick = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
        onFullScreen()
    }
    const handleResetBottomSheet = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.min(...snapPoints))
    }
    const handleServiceClick = (service: any) => {
        setSelectedEmergencyData(service)
        setIsDetail(true)
    }
    const handleChangeLocationOnClick = () => {
        setIsDetail(false)
        onFullScreen()
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
    }

    // detail state
    const updateDirectionRoute = useMapBox(
        (action) => action.updateDirectionRoute
    )
    const userLocationLatitude = useUserLocationData((state) => state.lat)
    const userLocationLongitude = useUserLocationData((state) => state.long)
    const [selectedEmergency, setSelectedEmergency] = useState<string>('')
    const [orderedEmergencyData, setOrderedEmergencyData] = useState<[]>([])

    // details
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
            (a: any, b: any) => a?.matrix?.duration - b?.matrix?.duration
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
                    <span>Di luar jangkauan</span>
                )}
            </>
        )
    }

    const badgeClassesByDuration = (duration: number): string => {
        if (duration <= 15) {
            return 'bg-green-100 text-green-800'
        } else if (duration >= 15 && duration <= 20) {
            return 'bg-orange-100 text-orange-800'
        } else if (duration > 20 && duration <= 25) {
            return 'bg-red-100 text-red-800'
        } else {
            return 'bg-black text-white'
        }
    }

    useEffect(() => {
        orderByDuration()
    }, [emergencyData])

    useEffect(() => {
        if (isSheetFullscreen) {
            sheetRef?.current?.snapTo(({ snapPoints }) =>
                Math.max(...snapPoints)
            )
        } else {
            sheetRef?.current?.snapTo(({ snapPoints }) =>
                Math.min(...snapPoints)
            )
        }
    }, [isSheetFullscreen])

    return (
        <div>
            <div className="bottom-sheet">
                <BottomSheet
                    open={mainBottomSheet.isOpen}
                    ref={sheetRef}
                    snapPoints={({ maxHeight, minHeight }) => [
                        maxHeight - maxHeight / 10,
                        // maxHeight / 8,
                        minHeight + 2,
                    ]}
                    blocking={false}
                >
                    <div>
                        <div className="sheet">
                            {isDetail && selectedEmergencyData ? (
                                <div className="detail-sheet">
                                    <div className="sheet-header border-b p-2 px-3 border-neutral-200 flex justify-between">
                                        <div className="flex gap-2 items-center">
                                            <div
                                                className={`flex items-center justify-center w-10 h-10 rounded-full bg-${selectedEmergencyData?.colorSecondary} `}
                                            >
                                                <Icon
                                                    name={
                                                        selectedEmergencyData?.icon
                                                    }
                                                    className={`text-${selectedEmergencyData?.colorMain} text-xl`}
                                                />
                                            </div>
                                            <div>
                                                <h1 className="text-lg leading-none m-0 text-neutral-800 font-semibold">
                                                    {
                                                        selectedEmergencyData?.name
                                                    }
                                                </h1>
                                                <p className="m-0 text-[14px] text-neutral-500">
                                                    {emergencyData?.length}{' '}
                                                    hasil ditemukan.
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
                                            onClick={() => setIsDetail(false)}
                                            type="button"
                                            className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                                        >
                                            <Icon
                                                name="ion:close"
                                                className="text-neutral-600 text-xl"
                                            />
                                        </button>
                                    </div>
                                    <div className="sheet-body search-result-wrapper max-h-[300px] overflow-y-scroll">
                                        <div className="mt-5">
                                            {orderedEmergencyData &&
                                                orderedEmergencyData?.map(
                                                    (
                                                        emergency: any,
                                                        emergencyIndex: number
                                                    ) => {
                                                        return (
                                                            <div
                                                                key={
                                                                    emergencyIndex
                                                                }
                                                                className="mx-3 mb-2 cursor-pointer"
                                                                onClick={() => {
                                                                    handleSelectedEmergency(
                                                                        emergency
                                                                    )
                                                                }}
                                                            >
                                                                <div
                                                                    className={`p-3 border border-neutral-100 rounded-lg shadow-sm bg-white w-full ${selectedEmergency == emergency.name ? 'ring-1 ring-neutral-200' : ''}`}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex items-start space-x-3">
                                                                            <div className="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
                                                                                <Image
                                                                                    alt="Organization logo"
                                                                                    width={
                                                                                        40
                                                                                    }
                                                                                    height={
                                                                                        40
                                                                                    }
                                                                                    src={
                                                                                        emergency.logo
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="font-semibold leading-none text-gray-900">
                                                                                    {
                                                                                        emergency?.name
                                                                                    }
                                                                                </h3>
                                                                                <p className="text-gray-500 leading-normal text-sm">
                                                                                    {
                                                                                        emergency?.organization
                                                                                    }
                                                                                </p>

                                                                                {/* Stats */}
                                                                                <div className="flex items-center text-gray-500 text-sm mt-1">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Icon name="mdi:circle-outline" />
                                                                                        {emergency?.type.join(
                                                                                            '-'
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <span
                                                                                className={` badge text-[10px] badge-icon border-0 shadow-none ${badgeClassesByDuration(emergency?.matrix?.duration)}`}
                                                                            >
                                                                                {parseResponseTime(
                                                                                    emergency
                                                                                        ?.matrix
                                                                                        ?.duration
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {selectedEmergency ===
                                                                        emergency?.name && (
                                                                        <div className="card-footer">
                                                                            <div className="flex gap-2 mt-3">
                                                                                <button
                                                                                    disabled={
                                                                                        emergency
                                                                                            ?.contact
                                                                                            .telp ==
                                                                                        null
                                                                                    }
                                                                                    className={`flex items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${emergency?.contact.telp == null ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                                                                >
                                                                                    <Icon
                                                                                        name="mdi:phone"
                                                                                        className="w-5 h-5 mr-2"
                                                                                    />
                                                                                    Telephone
                                                                                </button>
                                                                                <button className="relative flex w-full p-2 items-center justify-center border border-gray-200 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-100 transition">
                                                                                    <Icon
                                                                                        name="mingcute:chat-1-fill"
                                                                                        className="w-5 h-5 mr-2"
                                                                                    />
                                                                                    Whatsapp
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="main-sheet">
                                    <div className="sheet-header m-2">
                                        <SearchBoxSecondary
                                            rebuildMap={rebuildMap}
                                            searchBoxIsClicked={
                                                handleSearchInputOnClick
                                            }
                                            resetBottomSheet={
                                                handleResetBottomSheet
                                            }
                                        />
                                    </div>
                                    <div className="sheet-body my-3">
                                        <div className="mt-5 grid grid-cols-4 items-start">
                                            {services?.map(
                                                (
                                                    service: any,
                                                    index: number
                                                ) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            handleServiceClick(
                                                                service
                                                            )
                                                        }}
                                                        className="flex flex-col cursor-pointer items-center justify-center"
                                                    >
                                                        <div
                                                            className={`p-2 border-none rounded-lg bg-red-50 shadow-sm`}
                                                        >
                                                            <Icon
                                                                name={
                                                                    service?.icon
                                                                }
                                                                className={`text-red-500 text-[32px]`}
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
                        </div>
                    </div>
                </BottomSheet>
            </div>
        </div>
    )
}

export default MainBottomMenu
