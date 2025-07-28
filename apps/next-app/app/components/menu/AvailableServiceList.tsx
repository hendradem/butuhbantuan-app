import React, { useState } from 'react'
import Icon from '../ui/Icon'
import useLeaflet from '@/store/useLeaflet'
import toast from 'react-hot-toast'

interface PropsType {
    emergencyTypeData: any
    handleServiceClick: (service: any) => void
}

const AvailableServiceList: React.FC<PropsType> = ({
    emergencyTypeData,
    handleServiceClick,
}) => {
    const [reset, setReset] = useState(false)
    const setMapZoom = useLeaflet((state) => state.setMapZoom)

    const handleUnavailableServiceClick = () => {
        toast.error('Coming soon', {
            duration: 500,
        })
    }

    return (
        <div>
            <div className="grid grid-cols-4 items-start">
                {emergencyTypeData?.data?.map((service: any, index: number) => (
                    <div
                        key={index}
                        onClick={() => {
                            handleServiceClick(service)
                        }}
                        className="flex flex-col cursor-pointer items-center justify-center"
                    >
                        <div
                            className={`p-2.5 border-none rounded-full bg-red-50 shadow-sm`}
                        >
                            <Icon
                                name={service?.icon}
                                className={`text-red-500 text-[30px]`}
                            />
                        </div>
                        <div className="mx-3">
                            <h3 className="text-center text-[13px] mt-1 text-neutral-600 font-medium leading-[1.3]">
                                {service?.name}
                            </h3>
                        </div>
                    </div>
                ))}

                {emergencyTypeData?.data && (
                    <div>
                        <div
                            className="flex flex-col cursor-pointer items-center justify-center"
                            onClick={handleUnavailableServiceClick}
                        >
                            <div className="flex flex-col cursor-pointer items-center justify-center">
                                <div
                                    className={`p-2.5 border-none rounded-full bg-red-50 shadow-sm`}
                                >
                                    <Icon
                                        name="ph:dots-nine"
                                        className={`text-red-500 text-[30px]`}
                                    />
                                </div>
                                <div className="mx-3">
                                    <h3 className="text-center text-[13px] mt-1 text-neutral-600 font-medium leading-[1.3]">
                                        Lainnya
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AvailableServiceList
