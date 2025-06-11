import React from 'react'
import { useEmergencyTypeApi } from '@/app/store/api/emergency-type.api'
import SearchBoxSecondary from '../../maps/SearchBoxSecondary'
import Icon from '../../ui/Icon'
import SearchBox from '../../maps/SearchBox'

interface PropsType {
    rebuildMap: (arg1: any, arg2: any) => void
    handleSearchInputOnClick: () => void
    handleResetBottomSheet: () => void
    handleServiceClick: (service?: any) => void
}

const MainSection: React.FC<PropsType> = ({
    rebuildMap,
    handleSearchInputOnClick,
    handleResetBottomSheet,
    handleServiceClick,
}) => {
    const { emergencyTypeData, emergencyTypeLoading } = useEmergencyTypeApi()

    const skeletonLoader = () => {
        return (
            <div className="w-24 flex flex-col items-center space-y-2 animate-pulse">
                <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-300 rounded-md"></div>
                </div>

                <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="main-sheet">
                <div className="sheet-header m-2">
                    <SearchBoxSecondary
                        rebuildMap={rebuildMap}
                        searchBoxIsClicked={handleSearchInputOnClick}
                        resetBottomSheet={handleResetBottomSheet}
                    />
                </div>
                <div className="sheet-body my-3">
                    {emergencyTypeLoading && (
                        <div className="grid grid-cols-4">
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                        </div>
                    )}
                    <div className="mt-5 grid grid-cols-4 items-start">
                        {emergencyTypeData?.data?.map(
                            (service: any, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        handleServiceClick(service)
                                    }}
                                    className="flex flex-col cursor-pointer items-center justify-center"
                                >
                                    <div
                                        className={`p-2 border-none rounded-lg bg-red-50 shadow-sm`}
                                    >
                                        <Icon
                                            name={service?.icon}
                                            className={`text-red-500 text-[32px]`}
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

                        {emergencyTypeData?.data && (
                            <div className="flex flex-col cursor-pointer items-center justify-center">
                                <div
                                    className={`p-2 border-none rounded-lg bg-red-50 shadow-sm`}
                                >
                                    <Icon
                                        name="ph:dots-nine"
                                        className={`text-red-500 text-[32px]`}
                                    />
                                </div>
                                <div className="mx-3">
                                    <h3 className="text-center text-[11px] mt-1 text-neutral-600 font-medium leading-[1.3]">
                                        Lainnya
                                    </h3>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MainSection
