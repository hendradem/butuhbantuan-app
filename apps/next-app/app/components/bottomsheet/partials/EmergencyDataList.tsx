import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { HiClock } from 'react-icons/hi2'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import useExploreSheet from '@/store/useExploreSheet'
import useSearchSheet from '@/store/useSearchSeet'
import Icon from '../../ui/Icon'
import { cityNameFormat } from '@/utils/cityNameFormat'

interface Props {
    emergencyData: any
    handleSelectedEmergency: (emergency: any) => {}
    selectedEmergencyName: string
    dispatcherData: any[]
}

const EmergencyDataList: React.FC<Props> = ({
    emergencyData,
    handleSelectedEmergency,
    selectedEmergencyName,
    dispatcherData,
}) => {
    const exploreSheet = useExploreSheet()
    const searchSheet = useSearchSheet()

    const {
        onOpen: openConfirmationSheet,
        setCallType,
        setCallNumber,
    } = useConfirmationSheet()

    const renderEmergencyInfoBadge = (
        isDispatcher: boolean,
        responseTime: number
    ): JSX.Element => {
        const maxResponseTime: number = 20
        const flooredResponseTime = Math.floor(responseTime) * 2

        return (
            <>
                {isDispatcher && (
                    <span className="badge text-[11px] badge-icon border-0 shadow-none bg-indigo-500 text-white">
                        <Icon
                            name="fluent:person-call-16-filled"
                            className="mr-1 text-[15px]"
                        />
                        Dispatcher
                    </span>
                )}
                <span
                    className={`badge text-[11px] badge-icon border-0 shadow-none ${badgeClassesByDuration(flooredResponseTime)}`}
                >
                    {flooredResponseTime <= maxResponseTime ? (
                        <div className="flex items-center">
                            <HiClock className="mr-1 text-[15px]" />
                            <span> {flooredResponseTime} </span>
                            <span className="ml-1">min</span>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <span> null </span>
                        </div>
                    )}
                </span>
            </>
        )
    }

    const badgeClassesByDuration = (duration: number): string => {
        if (duration <= 15) {
            return 'bg-green-500 text-white'
        } else if (duration >= 15 && duration <= 18) {
            return 'bg-orange-500 text-white'
        } else if (duration > 18 && duration <= 20) {
            return 'bg-red-500 text-white'
        } else {
            return 'bg-black text-white'
        }
    }

    const onContactClick = (type: string, contactNumber: any, e: any): void => {
        e.stopPropagation() // Prevent the event from propagating to the parent element
        openConfirmationSheet()

        // const convertedPhoneNumber = convertPhoneNumber(contactNumber)

        switch (type) {
            case 'whatsapp':
                setCallType('whatsapp')
                setCallNumber(contactNumber)
                break
            case 'phone':
                setCallType('phone')
                setCallNumber(contactNumber)
                break
        }
    }

    const handleOpenSearchSheet = () => {
        exploreSheet.onClose()
        searchSheet.onOpen()
    }

    const ctaComponent = () => {
        return (
            <div className="flex items-center justify-center mt-2">
                <button
                    onClick={() => handleOpenSearchSheet()}
                    type="button"
                    className="btn-dark"
                >
                    Ubah pencarian
                </button>
                <button
                    onClick={() => exploreSheet.onClose()}
                    type="button"
                    className="btn-base"
                >
                    Cari di maps
                </button>
            </div>
        )
    }

    return (
        <div>
            {emergencyData?.map((emergency: any, emergencyIndex: number) => {
                const data = emergency.emergencyData
                const tripDuration = emergency.trip.duration

                return (
                    <div
                        key={emergencyIndex}
                        className="mx-3 mb-2 cursor-pointer"
                        onClick={() => {
                            handleSelectedEmergency(data)
                        }}
                    >
                        <div
                            className={`p-3 border border-neutral-100 shadow-sm rounded-[10px] bg-white w-full
                                        ${selectedEmergencyName === data.name ? ' border border-neutral-200' : ''}
                                    `}
                        >
                            <div className="">
                                <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
                                        <Image
                                            alt="Organization logo"
                                            width={40}
                                            height={40}
                                            src={data.organization_logo}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold leading-none text-gray-900">
                                                    {data?.name}
                                                </h3>
                                                <p className="text-gray-500 leading-normal text-sm">
                                                    {data?.organization_name}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {renderEmergencyInfoBadge(
                                                    data.is_dispatcher,
                                                    tripDuration
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex mt-1 items-center text-gray-500 text-sm gap-2">
                                            <span className="flex items-center gap-1">
                                                <Icon name="mingcute:location-fill" />
                                                <span className="m-0 leading-none">
                                                    {cityNameFormat(
                                                        data?.address.regency
                                                    )}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Icon name="mdi:circle-outline" />
                                                <span className="m-0 leading-none">
                                                    {data?.type_of_service}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedEmergencyName === data?.name && (
                                <div className="card-footer mt-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                onContactClick(
                                                    'whatsapp',
                                                    data.contact?.whatsapp,
                                                    e
                                                )
                                            }}
                                            disabled={
                                                data.contact?.whatsapp == null
                                            }
                                            className={`flex text-[15px] items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${
                                                data.contact?.whatsapp == null
                                                    ? 'opacity-80 cursor-not-allowed'
                                                    : 'hover:bg-green-700'
                                            }`}
                                        >
                                            <Icon
                                                name="mingcute:chat-1-fill"
                                                className="w-5 h-5 mr-2"
                                            />
                                            Whatsapp
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                onContactClick(
                                                    'phone',
                                                    data.contact?.phone,
                                                    e
                                                )
                                            }}
                                            disabled={
                                                data.contact?.phone == null
                                            }
                                            className={`flex text-[15px] w-full p-2 items-center justify-center bg-white border border-gray-100 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition ${
                                                data.contact?.phone == null
                                                    ? 'opacity-80 cursor-not-allowed'
                                                    : ''
                                            }`}
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
            })}
        </div>
    )
}

export default EmergencyDataList
