import React, { useEffect, useState } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import useEmergencyData from '@/app/store/useEmergencyData'
import SearchBoxSecondary from '../maps/SearchBoxSecondary'
import Icon from '../ui/Icon'
import Image from 'next/image'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import { HiClock } from 'react-icons/hi2'
import { convertPhoneNumber } from '@/app/utils/covertPhoneNumber'
import { useEmergencyTypeApi } from '@/app/store/api/emergency-type.api'

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
    const { emergencyTypeData, emergencyTypeLoading } = useEmergencyTypeApi()

    const mainBottomSheet = useMainBottomSheet()
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const onFullScreen = mainBottomSheet.onFullScreen
    const onExitFullScreen = mainBottomSheet.onExitFullScreen
    const isSheetFullscreen = mainBottomSheet.isFullScreen
    const emergencyData = useEmergencyData((state) => state.emergencyData)
    const selectedEmergencyDataState = useEmergencyData(
        (state) => state.selectedEmergencyData
    )
    const updateSelectedEmergencyData = useEmergencyData(
        (action) => action.updateSelectedEmergencyData
    )
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
    const handleServiceClick = (service?: any) => {
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
    const [selectedEmergencyName, setSelectedEmergencyName] =
        useState<string>('')

    // details
    const handleSelectedEmergency = async (emergency: any) => {
        console.log(emergency)
        setSelectedEmergencyName(emergency?.name) // to trigger focus on list component.
        updateSelectedEmergencyData({
            selectedEmergencyData: emergency,
            selectedEmergencySource: 'detail',
        })
        const directions = await getDirectionsRoute(
            [emergency?.coordinates[0], emergency?.coordinates[1]], // origin coordinate (emergency location)
            [userLocationLongitude, userLocationLatitude] // user location coordinate
        )
        updateDirectionRoute(directions)
        scrollToTop()
    }

    const skeletonLoader = () => {
        return (
            <div className="w-24 flex flex-col items-center space-y-2 animate-pulse">
                <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-300 rounded-md"></div>
                </div>

                <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
        )
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

    const onContactClick = (type: string, contactNumber: any, e: any): void => {
        e.stopPropagation() // Prevent the event from propagating to the parent element
        const convertedPhoneNumber = convertPhoneNumber(contactNumber)

        switch (type) {
            case 'whatsapp':
                window.open(`https://wa.me/${convertedPhoneNumber}`, '_blank')
                break
            case 'phone':
                window.open(`tel:${contactNumber}`, '_blank')
                break
        }
    }

    const handleCloseDetailSheet = () => {
        console.log('handle close')
        handleResetBottomSheet()
        setIsDetail(false)
        onExitFullScreen()
    }

    const scrollToTop = () => {
        console.log('scroll to top')
    }

    useEffect(() => {
        if (
            selectedEmergencyDataState &&
            selectedEmergencyDataState.selectedEmergencySource == 'map'
        ) {
            handleServiceClick(selectedEmergencyDataState.selectedEmergencyType)
            handleSelectedEmergency(
                selectedEmergencyDataState.selectedEmergencyData
            )
            scrollToTop()
        }
    }, [selectedEmergencyDataState])

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

    useEffect(() => {
        setSelectedEmergencyName('')
    }, [emergencyData])

    return (
        <div>
            <div className="bottom-sheet">
                <BottomSheet
                    open={mainBottomSheet.isOpen}
                    ref={sheetRef}
                    snapPoints={({ maxHeight, minHeight }) => [
                        maxHeight - maxHeight / 10,
                        minHeight + 2,
                    ]}
                    blocking={false}
                >
                    <div>
                        <div className="sheet">
                            {isDetail && selectedEmergencyData ? (
                                <div className="detail-sheet">
                                    <div className="sheet-header border-b p-2 px-3 bg-white border-neutral-100 flex items-center justify-between">
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
                                            onClick={() =>
                                                handleCloseDetailSheet()
                                            }
                                            type="button"
                                            className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                                        >
                                            <Icon
                                                name="ion:close"
                                                className="text-neutral-600 text-xl"
                                            />
                                        </button>
                                    </div>
                                    <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll max-h-[250px]">
                                        <div className="mt-5">
                                            {emergencyData?.length == 0 && (
                                                <div className="mx-3 mb-3 text-center text-slate-900">
                                                    Data emergency tidak
                                                    ditemukan
                                                    <div>
                                                        <button
                                                            onClick={() =>
                                                                handleChangeLocationOnClick()
                                                            }
                                                            type="button"
                                                            className="border focus:outline-none  focus:ring-4 font-medium rounded-lg text-sm mt-2 px-4 py-2 me-2 mb-2 bg-gray-800 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-600 focus:ring-gray-700"
                                                        >
                                                            Ubah Lokasi
                                                            Pencarian
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {emergencyData &&
                                                emergencyData?.map(
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
                                                                    className={`p-3 border border-neutral-100 shadow-sm rounded-[10px] bg-white w-full ${selectedEmergencyName == emergency.name ? ' border border-neutral-200' : ''}`}
                                                                >
                                                                    <div className="">
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
                                                                            <div className="w-full">
                                                                                <div className="flex justify-between">
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
                                                                                    </div>
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

                                                                                {/* Stats */}
                                                                                <div className="flex mt-1 items-center text-gray-500 text-sm gap-2">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Icon name="mingcute:location-fill" />
                                                                                        <span className="m-0 leading-none">
                                                                                            {
                                                                                                emergency
                                                                                                    ?.address
                                                                                                    .regency
                                                                                            }
                                                                                        </span>
                                                                                    </span>
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Icon name="mdi:circle-outline" />
                                                                                        <span className="m-0 leading-none">
                                                                                            {
                                                                                                emergency?.typeOfService
                                                                                            }
                                                                                        </span>
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {selectedEmergencyName ===
                                                                        emergency?.name && (
                                                                        <div className="card-footer mt-4">
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={(
                                                                                        e
                                                                                    ) => {
                                                                                        onContactClick(
                                                                                            'whatsapp',
                                                                                            emergency
                                                                                                .contact
                                                                                                .whatsapp,
                                                                                            e
                                                                                        )
                                                                                    }}
                                                                                    disabled={
                                                                                        emergency
                                                                                            ?.contact
                                                                                            .whatsapp ==
                                                                                        null
                                                                                    }
                                                                                    className={`flex text-[15px] items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${emergency?.contact.whatsapp == null ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                                                                >
                                                                                    <Icon
                                                                                        name="mingcute:chat-1-fill"
                                                                                        className="w-5 h-5 mr-2"
                                                                                    />
                                                                                    Whatsapp
                                                                                </button>
                                                                                <button
                                                                                    onClick={(
                                                                                        e
                                                                                    ) => {
                                                                                        onContactClick(
                                                                                            'phone',
                                                                                            emergency
                                                                                                .contact
                                                                                                .telp,
                                                                                            e
                                                                                        )
                                                                                    }}
                                                                                    disabled={
                                                                                        emergency
                                                                                            ?.contact
                                                                                            .telp ==
                                                                                        null
                                                                                    }
                                                                                    className={`flex text-[15px] w-full p-2 items-center justify-center bg-white border border-gray-100 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition ${emergency?.contact.telp == null ? 'opacity-80 cursor-not-allowed' : ''}`}
                                                                                >
                                                                                    <Icon
                                                                                        name="mdi:phone"
                                                                                        className="w-5 h-5 mr-2"
                                                                                    />
                                                                                    Telephone
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
                                        {emergencyTypeLoading && (
                                            <div className="grid grid-cols-4">
                                                <div>{skeletonLoader()}</div>
                                                <div>{skeletonLoader()}</div>
                                                <div>{skeletonLoader()}</div>
                                                <div>{skeletonLoader()}</div>
                                            </div>
                                        )}
                                        <div className="mt-5 grid grid-cols-4 items-start">
                                            {emergencyTypeData?.data?.map(
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

                                            {emergencyTypeData?.data && (
                                                <div className="flex flex-col cursor-pointer items-center justify-center">
                                                    <div
                                                        className={`p-2 border-none rounded-lg bg-red-50 shadow-sm`}
                                                    >
                                                        <Icon
                                                            name="ph:dots-nine"
                                                            className={`text-red-500 text-[32px]`}
                                                        />
                                                    </div>
                                                    <div className="mx-3">
                                                        <h3 className="text-center text-[11px] mt-1 text-neutral-600 font-medium leading-[1.3]">
                                                            Lainnya
                                                        </h3>
                                                    </div>
                                                </div>
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
