import React, { useEffect, useState } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import useEmergencyData from '@/app/store/useEmergencyData'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import DetailSection from './partials/DetailSection'
import MainSection from './partials/MainSection'
import EmergencyDataList from './partials/EmergencyDataList'
import Icon from '@/app/components/ui/Icon'
import useDetailSheet from '@/app/store/useDetailSheet'
import EmergencyDataSingleList from './partials/EmergencyDataSingleList'

const DetailBottomSheet = () => {
    // const emergencyData = useEmergencyData((state) => state.emergencyData)
    const emergencyData = useDetailSheet((state) => state.detailSheetData)

    const sheetRef = React.useRef<BottomSheetRef>(null)
    const detailSheet = useDetailSheet()

    const handleSelectedEmergency = (data: any) => {
        console.log(data)
    }

    const handleCloseDetailSheet = (): void => {
        detailSheet.onClose()
    }

    useEffect(() => {
        console.log(emergencyData)
    }, [emergencyData])

    useEffect(() => {
        console.log(detailSheet.isOpen)
        console.log(emergencyData)
    }, [detailSheet.isOpen])

    return (
        <div>
            <div className="bottom-sheet">
                <BottomSheet
                    open={detailSheet.isOpen}
                    ref={sheetRef}
                    snapPoints={({
                        maxHeight,
                        minHeight,
                    }: {
                        maxHeight: number
                        minHeight: number
                    }) => [maxHeight - maxHeight / 10, minHeight + 2]}
                    blocking={false}
                >
                    <div>
                        <div className="sheet">
                            <div className="detail-sheet">
                                <div className="sheet-header border-b p-2 px-3 bg-white border-neutral-100 flex items-center justify-between">
                                    <div className="flex gap-2 items-center">
                                        <div
                                            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-red-50`}
                                        >
                                            <Icon
                                                name={`${emergencyData?.emergencyType?.icon}`}
                                                className={`text-red-500 text-xl`}
                                            />
                                        </div>
                                        <div>
                                            <h1 className="text-lg leading-none m-0 text-neutral-800 font-semibold">
                                                {emergencyData?.emergency?.name}
                                            </h1>
                                            <p className="m-0 text-[14px] text-neutral-500">
                                                {
                                                    emergencyData?.emergency
                                                        ?.responseTime?.duration
                                                }{' '}
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
                                <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll max-h-[250px]">
                                    <div className="mt-5">
                                        <EmergencyDataSingleList
                                            emergencyData={
                                                emergencyData?.emergency
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </BottomSheet>
            </div>
        </div>
    )
}

export default DetailBottomSheet
