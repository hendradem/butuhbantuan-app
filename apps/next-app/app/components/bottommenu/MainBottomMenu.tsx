import React, { useEffect, useState } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import BottomSheetMain from '../bottomsheet/Bottomsheet'
import { RiMessage3Line } from 'react-icons/ri'
import { HiMiniPhone } from 'react-icons/hi2'
import { FaCarCrash } from 'react-icons/fa'
import { MdCarCrash, MdFireTruck } from 'react-icons/md'
import { FaTruckMedical } from 'react-icons/fa6'
import { MdKeyboardArrowUp } from 'react-icons/md'
import SearchBoxSecondary from '../maps/SearchBoxSecondary'
import Icon from '../ui/Icon'
import services from '@/app/store/data/services.json'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
}

const MainBottomMenu: React.FC<MapsPropsType> = ({ rebuildMap }) => {
    const mainBottomSheet = useMainBottomSheet()
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const isSheetFullscreen = mainBottomSheet.isFullScreen
    const onFullScreen = mainBottomSheet.onFullScreen
    const onExitFullScreen = mainBottomSheet.onExitFullScreen

    const handleSearchInputOnClick = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
        onFullScreen()
    }

    const handleResetBottomSheet = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.min(...snapPoints))
        onExitFullScreen()
    }

    useEffect(() => {
        console.log(isSheetFullscreen)

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
                    <div className="m-2">
                        <div>
                            <SearchBoxSecondary
                                rebuildMap={rebuildMap}
                                searchBoxIsClicked={handleSearchInputOnClick}
                                resetBottomSheet={handleResetBottomSheet}
                            />
                        </div>
                        <div className="service-menu my-3">
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
                                                    className={`text-${service?.colorMain} text-[32px]`}
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

                            {/* <div className="w-full overflow-x-scroll">
                                <div className="flex items-center gap-2">
                                    <div className="flex-shrink-0  rounded hover:cursor-pointer flex gap-1.5 items-center">
                                        <div className="p-1.5 flex items-center justify-center bg-blue-50 rounded-md">
                                            <FaTruckMedical className="text-blue-400 text-sm m-0" />
                                        </div>
                                        <h3 className="font-semibold text-[13px] text-neutral-500">
                                            Ambulance
                                        </h3>
                                    </div>
                                    <div className="flex-shrink-0  rounded hover:cursor-pointer flex gap-1.5 items-center">
                                        <div className="p-1.5 flex items-center justify-center bg-red-50 rounded-md">
                                            <MdFireTruck className="text-red-400 text-sm m-0" />
                                        </div>
                                        <h3 className="font-semibold text-[13px] text-neutral-500">
                                            Pemadam Kebakaran
                                        </h3>
                                    </div>
                                    <div className="flex-shrink-0  rounded hover:cursor-pointer flex gap-1.5 items-center">
                                        <div className="p-1.5 flex items-center justify-center bg-orange-50 rounded-md">
                                            <FaCarCrash className="text-orange-400 text-sm m-0" />
                                        </div>
                                        <h3 className="font-semibold text-[13px] text-neutral-500">
                                            Tim SAR
                                        </h3>
                                    </div>
                                    <div className="flex-shrink-0  rounded hover:cursor-pointer flex gap-1.5 items-center">
                                        <div className="p-1.5 flex items-center justify-center bg-green-50 rounded-md">
                                            <MdCarCrash className="text-green-400 text-sm m-0" />
                                        </div>
                                        <h3 className="font-semibold text-[13px] text-neutral-500">
                                            Bengkel
                                        </h3>
                                    </div>
                                    <div className="flex-shrink-0  rounded hover:cursor-pointer flex gap-1.5 items-center">
                                        <div className="p-1.5 flex items-center justify-center bg-red-50 rounded-md">
                                            <MdCarCrash className="text-red-400 text-sm m-0" />
                                        </div>
                                        <h3 className="font-semibold text-[13px] text-neutral-500">
                                            Tambal Ban
                                        </h3>
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </BottomSheet>
            </div>
        </div>
    )
}

export default MainBottomMenu
