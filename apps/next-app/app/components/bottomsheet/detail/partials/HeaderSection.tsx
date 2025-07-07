import React from 'react'
import Icon from '@/components/ui/Icon'

interface PropTypes {
    emergencyData: any
    handleCloseDetailSheet: () => void
}

const HeaderSection: React.FC<PropTypes> = ({
    emergencyData,
    handleCloseDetailSheet,
}) => {
    return (
        <div>
            <div className="sheet-header border-b py-3 px-3 bg-white border-neutral-100 rounded-t-[40px] flex items-center justify-between">
                <div className="flex gap-2 mt-1 items-center rounded-t-[40px]">
                    <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-red-50`}
                    >
                        <Icon
                            name={`${emergencyData?.emergencyType?.icon}`}
                            className={`text-red-500 text-xl`}
                        />
                    </div>
                    <div>
                        <h1 className="text-md leading-none m-0 text-neutral-800 font-semibold">
                            {emergencyData?.emergency?.name}
                        </h1>
                        <p className="m-0 mt-1 leading-none text-[14px] text-neutral-500">
                            {emergencyData?.emergency?.responseTime?.duration}{' '}
                            menit dari lokasimu saat ini
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => handleCloseDetailSheet()}
                    type="button"
                    className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                >
                    <Icon
                        name="ion:close"
                        className="text-neutral-600 text-xl"
                    />
                </button>
            </div>
        </div>
    )
}

export default HeaderSection
