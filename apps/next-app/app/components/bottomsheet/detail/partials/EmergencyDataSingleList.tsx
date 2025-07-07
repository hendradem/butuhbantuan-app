import React from 'react'
import Image from 'next/image'
import { HiClock } from 'react-icons/hi2'
import { convertPhoneNumber } from '@/utils/covertPhoneNumber'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import Icon from '../../../ui/Icon'

interface Props {
    emergencyData: any
}

const EmergencyDataSingleList: React.FC<Props> = ({ emergencyData }) => {
    const {
        onOpen: openConfirmationSheet,
        setCallType,
        setCallNumber,
    } = useConfirmationSheet()

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
                    className={`p-3 shadow-sm rounded-[10px] bg-white w-full border border-neutral-200`}
                >
                    <div className="">
                        <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
                                <Image
                                    src={emergencyData?.logo}
                                    alt="Organization logo"
                                    width={40}
                                    height={40}
                                />
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between">
                                    <div>
                                        <h3 className="font-semibold leading-none text-gray-900">
                                            {emergencyData?.name}
                                        </h3>
                                        <p className="text-gray-500 leading-normal text-sm">
                                            {emergencyData?.organization}
                                        </p>
                                    </div>
                                    <div>
                                        <span
                                            className={` badge text-[10px] badge-icon border-0 shadow-none ${badgeClassesByDuration(emergencyData?.responseTime?.duration)}`}
                                        >
                                            {parseResponseTime(
                                                emergencyData?.responseTime
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
                                            {emergencyData?.address?.regency}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Icon name="mdi:circle-outline" />
                                        <span className="m-0 leading-none">
                                            {emergencyData?.typeOfService}
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
                                className={`flex text-[15px] items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${emergencyData?.contact.whatsapp == null ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'}`}
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
                                className={`flex text-[15px] w-full p-2 items-center justify-center bg-white border border-gray-100 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition ${emergencyData?.contact.phone == null ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                                <Icon
                                    name="mdi:phone"
                                    className="w-5 h-5 mr-2"
                                />
                                Telephone
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmergencyDataSingleList
