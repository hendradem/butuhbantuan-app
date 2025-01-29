'use client'
import React, { ReactNode, useCallback, useEffect, useState } from 'react'
import BottomSheetMain from '../components/bottomsheet/Bottomsheet'
import useBottomSheet from '../hooks/useBottomSheet'
import Maps from '../components/maps/Maps'
import DetailMaps from '../components/maps/DetailMaps'
import { FaCarOn, FaCar, FaLocationDot } from 'react-icons/fa6'
import { RiMessage3Line, RiShareFill } from 'react-icons/ri'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
    HiCheckBadge,
    HiClock,
    HiMapPin,
    HiMiniPhone,
    HiMiniRectangleStack,
} from 'react-icons/hi2'
import useUserLocationData from '../store/useUserLocationData'

import Modal from '@/app/components/commons/Modal'
import useModal from '@/app/store/useModal'
import Image from 'next/image'
import ambulanceData from '@/app/store/data/ambulancedata.json'
import useCalculateDistance from '@/app/hooks/useCalculate'
import useCalculateDuration from '@/app/hooks/useCalculateDuration'

const Page = () => {
    const [selectedEmergencyPartner, setSelectedEmergencyPartner] =
        useState<any>({})
    const [selectedFilter, setSelectedFilter] = useState('all')
    const { updateChangeLocationModal } = useModal()
    const bottomSheet = useBottomSheet()
    const serchParams = useSearchParams()
    const emergencyType = serchParams.get('type')

    const endLong = localStorage.getItem('long')
    const endLat = localStorage.getItem('lat')

    const latitudeState = useUserLocationData((state) => state.lat)
    const longitudeState = useUserLocationData((state) => state.long)

    const coordinatesToCalculateTheRoute = {
        startLong: selectedEmergencyPartner?.coordinates?.long,
        startLat: selectedEmergencyPartner?.coordinates?.lat,
        endLong: endLong,
        endLat: endLat,
    }

    const onToggle = useCallback(
        (partner: object) => {
            setSelectedEmergencyPartner(partner)
            bottomSheet.onClose()
            bottomSheet.onOpen()

            console.log('item clicked')
            console.log(partner)
        },

        [bottomSheet]
    )

    const onContactClick = (type: string, e: any): void => {
        e.stopPropagation() // Prevent the event from propagating to the parent element
        switch (type) {
            case 'whatsapp':
                window.open(
                    `https://wa.me/${selectedEmergencyPartner.contact.whatsapp}`,
                    '_blank'
                )
                break
            case 'phone':
                window.open(
                    `tel:${selectedEmergencyPartner.contact.phone}`,
                    '_blank'
                )
                break
        }
    }

    const testMapData = ambulanceData.map((data: any) => {
        return (
            <div
                className="flow-root hover:cursor-pointer relative"
                key={data.id}
                onClick={() => {
                    onToggle(data)
                }}
            >
                <ul className="mt-3">
                    <li className=" bg-white border border-gray-200 shadow-sm rounded-lg hover:shadow-xs ">
                        <div className="flex items-center space-x-4 py-2 px-3">
                            <div className="bg-white rounded-xl">
                                <Image
                                    alt="Organization logo"
                                    width={40}
                                    height={40}
                                    src={`${
                                        data.logo != null
                                            ? data.logo
                                            : '/assets/icons/ambulance.svg'
                                    }`}
                                />
                            </div>
                            <div className="flex-1 leading-tight min-w-0">
                                <div className="flex items-center">
                                    <p className="text-md font-semibold text-gray-900 truncate">
                                        {data.name}
                                    </p>
                                    {data.isVerified && (
                                        <HiCheckBadge className="text-blue-500 ml-1" />
                                    )}
                                </div>
                                <span className="text-[13px] font-normal my-0 text-gray-600">
                                    {data.organization}
                                </span>
                            </div>
                            <div className="space-x-1 hidden md:hidden">
                                <div className="flex items-center">
                                    <span className="badge badge-icon bg-blue-50 text-blue-600 border-0 shadow-none mr-1">
                                        <HiMapPin className="mr-1" />7 km
                                    </span>
                                    <span className="badge badge-icon bg-blue-50 text-blue-600 border-0 shadow-none">
                                        <HiClock className="mr-1" /> 12 Min
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="border border-t border-gray-100 bg-gray-50 flex space-x-2 p-2 px-3 justify-between rounded-b-lg">
                            <div className="md:w-full md:flex-row space-y-1 md:grow-0">
                                <span className="badge badge-icon max-w-fit px-1 pr-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 shadow-none mr-1">
                                    <HiMapPin className="mr-1" />
                                </span>
                                <span className="badge badge-icon max-w-fit px-1 pr-1.5 py-0 bg-blue-50 text-blue-600 border-blue-100 shadow-none">
                                    <HiClock className="mr-1" />
                                    12 Min
                                </span>
                            </div>
                            <div className="flex space-x-2 md:w-full justify-end">
                                <button
                                    onClick={(e) => {
                                        onContactClick('whatsapp', e)
                                    }}
                                    className="button flex items-center justify-center w-auto p-2 px-4 shadow-sm"
                                >
                                    <RiMessage3Line
                                        size={18}
                                        className="mr-2"
                                    />
                                    <span className="hidden md:block">
                                        WhatsApp
                                    </span>
                                    <span className="md:hidden">WA</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        onContactClick('phone', e)
                                    }}
                                    className="button flex items-center justify-center w-auto p-2 px-4 text-white bg-black hover:bg-black hover:text-white"
                                >
                                    <HiMiniPhone size={18} className="mr-2" />
                                    Telfon
                                </button>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        )
    })

    return (
        <div className="h-full text-gray-700">
            <div>
                <main>
                    <div className="w-full h-[450px] rounded-xl">
                        <Maps mapHeight="450px" mapComponentType="detail" />
                    </div>

                    <div className="px-3">
                        <h2 className="font-medium my-3">
                            {emergencyType &&
                                'Menampilkan ' +
                                    emergencyType?.charAt(0).toUpperCase() +
                                    emergencyType?.slice(1) +
                                    ' '}
                            di sekitarmu
                        </h2>

                        <div className="filter flex space-x-1 mb-3 border-b border-t py-1">
                            <button className="w-full justify-center button-icon-default rounded-lg bg-black  text-white shadow-xs py-2">
                                <HiMiniRectangleStack className="mr-2" /> Semua
                                tipe
                            </button>
                            <button className="w-full justify-center button-icon-default rounded-lg bg-white shadow-xs py-2">
                                <FaCarOn className="mr-2" size={14.5} />{' '}
                                Emergency
                            </button>
                            <button className="w-full justify-center button-icon-default rounded-lg bg-white shadow-xs py-2">
                                <FaCar className="mr-2" /> Transport
                            </button>
                        </div>

                        <div className="data-list h-auto overflow-y-scroll">
                            {testMapData}
                        </div>
                    </div>
                </main>
            </div>
            <BottomSheetMain
                isOpen={bottomSheet.isOpen}
                onClose={bottomSheet.onClose}
                onOpen={bottomSheet.onOpen}
                sheetTitle={selectedEmergencyPartner.name}
                footerContent={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                onContactClick('whatsapp', e)
                            }}
                            className="button w-full flex items-center justify-center gap-2 shadow-sm"
                        >
                            <RiMessage3Line className="text-lg" />
                            Whatsapp
                        </button>
                        <button
                            onClick={(e) => {
                                onContactClick('phone', e)
                            }}
                            className="button w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-black hover:text-white border-black"
                        >
                            <HiMiniPhone className="text-lg text-white" />{' '}
                            Telephone
                        </button>
                    </div>
                }
            >
                <>
                    <div className="w-full h-[auto] rounded-md bg-gray-100">
                        <DetailMaps
                            coordinates={coordinatesToCalculateTheRoute}
                        ></DetailMaps>
                    </div>
                    <div className="partner-info mt-4 mb-2 border border-gray-200 shadow-xs flex items-center justify-between rounded-md p-2.5">
                        <div className="flex items-center gap-3">
                            <div className="bg-white rounded-xl">
                                <Image
                                    alt="Organization logo"
                                    width={30}
                                    height={30}
                                    src={`${
                                        selectedEmergencyPartner.logo != null
                                            ? selectedEmergencyPartner.logo
                                            : '/assets/icons/ambulance.svg'
                                    }`}
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold lh-none text-gray-800">
                                    {selectedEmergencyPartner?.name}{' '}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <p className="text-sm leading-none font-normal">
                                        {selectedEmergencyPartner?.organization}
                                    </p>
                                    {selectedEmergencyPartner?.isVerified && (
                                        <HiCheckBadge className="text-blue-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            <button className="button-icon-default">
                                <RiShareFill className="text-lg" />
                            </button>
                        </div>
                    </div>
                    <div className="px-3 my-5">
                        <ol className="relative border-s border-gray-200">
                            <li className="mb-4 ms-7">
                                <span className="absolute flex items-center justify-center w-6 h-6 bg-red-500 rounded-full -start-3 ring-8 ring-white ">
                                    <FaCarOn className="text-white text-sm" />
                                </span>
                                <div className="flex items-center gap-2">
                                    <h3 className="flex items-center text-[15px] leading-none p-0 m-0 font-semibold text-gray-700">
                                        {selectedEmergencyPartner.name}{' '}
                                    </h3>
                                    <span className="badge warning py-0">
                                        {/* {useCalculateDuration(
                                            selectedEmergencyPartner.duration
                                        )}{' '} */}
                                        {selectedEmergencyPartner.name}
                                        Menit
                                    </span>
                                </div>
                                <time className="block my-1.5 text-[14px] font-normal leading-none text-gray-400">
                                    {selectedEmergencyPartner.fullAddress}
                                </time>
                            </li>
                            <li className="mb-4 ms-7">
                                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full -start-3 ring-8 ring-white ">
                                    <FaLocationDot className="text-white text-sm" />
                                </span>
                                <div className="flex items-center gap-2">
                                    <h3 className="flex items-center text-[15px] leading-none p-0 m-0 font-semibold text-gray-700">
                                        Lokasi anda
                                    </h3>
                                </div>
                                <p className="block my-1.5 text-[14px] font-normal leading-none text-gray-400">
                                    Sekitar Pogung Baru, Sinduadi, Mlati, Sleman
                                </p>
                            </li>
                        </ol>
                    </div>
                </>
            </BottomSheetMain>
        </div>
    )
}

export default Page
