import React from 'react'
import Icon from '../../ui/Icon'

interface ServiceLoadingProps {
    currentUserRegency: string
}

const ServiceLoading = ({ currentUserRegency }: ServiceLoadingProps) => {
    return (
        <div>
            <div className="grid gap-4 w-60">
                <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full shadow-sm justify-center items-center inline-flex animate-pulse">
                    <Icon
                        name="hugeicons:square-arrow-data-transfer-diagonal"
                        className="text-blue-500 text-[40px]"
                    />
                </div>

                <div>
                    <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
                        Menyiapkan layanan untukmu
                    </h2>
                    <p className="text-center text-black text-sm font-normal leading-snug pb-4">
                        Sedang menyiapkan layanan untuk <br /> daerah{' '}
                        {currentUserRegency}
                    </p>
                    <div className="flex flex-col gap-2">
                        <div className="w-full h-[30px] rounded-xl bg-neutral-200 animate-pulse"></div>
                        <div className="w-full h-[30px] rounded-xl bg-neutral-200 animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ServiceLoading
