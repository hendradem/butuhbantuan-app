import React, { useEffect } from 'react'
import { HiClock } from 'react-icons/hi2'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import Icon from '../../../ui/Icon'
import { cityNameFormat } from '@/utils/cityNameFormat'
import Image from 'next/image'
import { truncateText } from '@/utils/textTruncate'

interface Props {
    data: any
}

const EmergencyDataSingleList: React.FC<Props> = ({ data }) => {
    const {
        onOpen: openConfirmationSheet,
        setCallType,
        setCallNumber,
    } = useConfirmationSheet()

    const emergencyData = data?.emergencyData
    const tripData = data?.trip

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

    const renderEmergencyInfoBadge = (
        isDispatcher: boolean,
        responseTime: number
    ): JSX.Element => {
        const maxResponseTime: number = 20
        const flooredResponseTime = Math.floor(responseTime) * 2

        return (
            <>
                {isDispatcher && (
                    <span className="badge rounded-full text-[11px] badge-icon border-0 shadow-none bg-blue-500 text-white">
                        <Icon
                            name="fluent:person-call-16-filled"
                            className="text-[15px]"
                        />
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
                            <span> +20 min </span>
                        </div>
                    )}
                </span>
            </>
        )
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

    return (
        <div>
            <div className="mx-3 mb-2 cursor-pointer">
                <div
                    className={`p-3  shadow-sm rounded-[10px] bg-white w-full border border-neutral-200`}
                >
                    <div>
                        <div className="flex">
                            <div className="w-[15%]">
                                <div className="card-image w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
                                    {emergencyData && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <Image
                                            alt="Organization logo"
                                            width={40}
                                            height={40}
                                            src={
                                                emergencyData?.organization_logo ??
                                                ''
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="w-[85%] card-content">
                                <div className="emergency-name-and-duration flex justify-between items-center truncate">
                                    <h3 className="font-semibold leading-none text-gray-900">
                                        {truncateText(emergencyData?.name, 18)}
                                    </h3>

                                    <div className="flex items-center gap-2">
                                        {emergencyData &&
                                            renderEmergencyInfoBadge(
                                                emergencyData?.is_dispatcher,
                                                tripData?.duration
                                            )}
                                    </div>
                                </div>

                                <div className="emergency-organization-name">
                                    <p className="text-gray-500 leading-normal truncate text-sm">
                                        {truncateText(
                                            emergencyData?.organization_name,
                                            28
                                        )}
                                    </p>
                                </div>

                                <div className="emergency-info flex mt-2 items-center text-gray-500 text-sm gap-2 truncate">
                                    <span className="flex items-center gap-1">
                                        <Icon name="mingcute:location-fill" />
                                        <span className="m-0 leading-none">
                                            {emergencyData &&
                                                cityNameFormat(
                                                    emergencyData?.address
                                                        ?.regency
                                                )}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Icon name="mdi:circle-outline" />
                                        <span className="m-0 leading-none">
                                            {emergencyData?.type_of_service}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-footer mt-4">
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    onContactClick(
                                        'whatsapp',
                                        emergencyData?.contact?.whatsapp,
                                        e
                                    )
                                }}
                                disabled={
                                    emergencyData?.contact?.whatsapp == null
                                }
                                className={`flex text-[15px] items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${
                                    emergencyData?.contact?.whatsapp == null
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
                                        emergencyData?.contact?.phone,
                                        e
                                    )
                                }}
                                disabled={emergencyData?.contact?.phone == null}
                                className={`flex text-[15px] w-full p-2 items-center justify-center bg-white border border-gray-100 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition ${
                                    emergencyData?.contact?.phone == null
                                        ? 'opacity-80 cursor-not-allowed'
                                        : ''
                                }`}
                            >
                                <Icon
                                    name="mdi:phone"
                                    className="w-5 h-5 mr-2"
                                />
                                Telfon
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmergencyDataSingleList
