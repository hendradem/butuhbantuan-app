import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Icon from '../ui/Icon'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useResultSheet from '@/app/store/useResultSheet'
import useEmergencyData from '@/app/store/useEmergencyData'
import { HiCheckBadge, HiClock, HiMapPin, HiMiniPhone } from 'react-icons/hi2'
import { RiMessage3Line } from 'react-icons/ri'

type ResultSheetPropsType = {
    emergencyType: {
        name: string
        icon: string
        color: string
    }
}

const Resultsheet: React.FC<ResultSheetPropsType> = ({ emergencyType }) => {
    const resultSheet = useResultSheet()
    const selectedEmergencyData = useEmergencyData(
        (state) => state.selectedEmergencyData
    )
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const emergencyData = useEmergencyData((state) => state.emergencyData)
    const [selectedEmergency, setSelectedEmergency] = useState<string>('')

    const handleSelectedEmergency = (name: string) => {
        setSelectedEmergency(name)
    }

    const orderByDuration = (): void => {
        return emergencyData?.sort(
            (a: any, b: any) => a?.matrix?.duration - b?.matrix?.duration
        )
    }

    const colorByDuration = (duration: number): string => {
        if (duration <= 10) {
            return 'blue-500'
        } else if (duration > 10 && duration <= 15) {
            return 'orange-500'
        } else if (duration > 10 && duration <= 20) {
            return 'red-500'
        } else {
            return 'red-500'
        }
    }

    useEffect(() => {
        orderByDuration()
        console.log('any updates')
    }, [emergencyData])

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
                                className={`flex items-center justify-center w-10 h-10 rounded-full bg-${selectedEmergencyData.colorSecondary} `}
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
                                    {emergencyData?.length} hasil ditemukan
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
                    <div className="service-menu my-2">
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
                                                className={`list-wrapper cursor-pointer border-neutral-100 ${emergencyIndex == 0 ? 'border-t' : 'border-b'} `}
                                                onClick={() => {
                                                    handleSelectedEmergency(
                                                        emergency.name
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
                                                                    className={` badge mb-1 text-[10px] badge-icon bg-neutral-50 border-0 shadow-none text-${colorByDuration(emergency?.matrix?.duration)}`}
                                                                >
                                                                    <HiClock className="mr-1" />
                                                                    {
                                                                        emergency
                                                                            ?.matrix
                                                                            ?.duration
                                                                    }
                                                                    <span className="ml-1">
                                                                        min
                                                                    </span>
                                                                </span>
                                                                <span className="badge text-[10px] badge-icon bg-neutral-50 text-neutral-600 border-0 shadow-none">
                                                                    <HiMapPin className="mr-1" />
                                                                    {
                                                                        emergency?.type
                                                                    }
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
