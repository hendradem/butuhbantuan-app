import React from 'react'
import Image from 'next/image'
import { HiClock } from 'react-icons/hi2'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import Icon from '@/components/ui/Icon'

interface Props {
    dispatcherData: any
}

const DispatcherList: React.FC<Props> = ({ dispatcherData }) => {
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
                    className={`badge text-[11px] badge-icon border-0 shadow-none ${badgeClassesByDuration(responseTime)}`}
                >
                    {responseTime <= maxResponseTime ? (
                        <div className="flex items-center">
                            <HiClock className="mr-1 text-[15px]" />
                            <span> {Math.floor(+responseTime)} </span>
                            <span className="ml-1">min</span>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <span>Luar Zona</span>
                        </div>
                    )}
                </span>
            </>
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
            <div className="cursor-pointer px-3">
                <div
                    className={`p-3 shadow-sm rounded-[10px] bg-emerald-50 border border-emerald-500 text-black w-full`}
                >
                    <div className="">
                        <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-white border border-neutral-100 p-1.5 rounded-lg flex items-center justify-center">
                                <Image
                                    src={dispatcherData?.organization_logo}
                                    alt="Organization logo"
                                    width={40}
                                    height={40}
                                />
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between">
                                    <div>
                                        <h3 className="font-semibold leading-none text-neutral-800">
                                            {dispatcherData?.name}
                                        </h3>
                                        <p className="text-neutral-600 leading-normal text-sm">
                                            {dispatcherData?.organization_name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {renderEmergencyInfoBadge(
                                            dispatcherData.is_dispatcher,
                                            dispatcherData?.responseTime
                                                ?.duration
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex mt-1 items-center text-gray-600 text-sm gap-2">
                                    Command Center Wilayah Sleman
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
                                        dispatcherData?.contact?.whatsapp,
                                        e
                                    )
                                }}
                                disabled={
                                    dispatcherData?.contact?.whatsapp == null
                                }
                                className={`flex text-[15px] items-center w-full p-2 justify-center bg-green-600 text-white font-medium rounded-lg shadow-sm transition ${dispatcherData?.contact.whatsapp == null ? 'opacity-80 cursor-not-allowed' : 'hover:bg-green-700'}`}
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
                                        dispatcherData?.contact?.phone,
                                        e
                                    )
                                }}
                                disabled={
                                    dispatcherData?.contact?.phone == null
                                }
                                className={`flex text-[15px] w-full p-2 items-center justify-center bg-white border border-gray-100 text-neutral-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition ${dispatcherData?.contact.phone == null ? 'opacity-80 cursor-not-allowed' : ''}`}
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

export default DispatcherList
