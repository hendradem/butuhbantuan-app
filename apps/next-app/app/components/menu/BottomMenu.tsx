'use client'
import React, { useRef, useState } from 'react'
import { useEmergencyTypeApi } from '@/store/api/emergency-type.api'
import PreviewSearchBox from '../search/preview/PreviewSearchBox'
import useDetailSheet from '@/store/useDetailSheet'
import useEmergencyData from '@/store/useEmergencyData'
import useExploreSheet from '@/store/useExploreSheet'
import AvailableServiceList from './AvailableServiceList'

const BottomMenu = () => {
    const { emergencyTypeData, emergencyTypeLoading } = useEmergencyTypeApi()
    const { setDetailSheetData } = useDetailSheet()
    const { setSheetData: setExploreSheetData, onOpen: openExploreSheet } =
        useExploreSheet()
    const { emergencyData } = useEmergencyData()

    const handleServiceClick = (service?: any) => {
        const serviceID = service?.id
        const filteredEmergencies = emergencyData.filter((item: any) => {
            return +item.id === serviceID
        })
        setDetailSheetData({
            emergencyType: service,
            emergency: filteredEmergencies,
        })
        setExploreSheetData({
            emergencyType: service,
            emergency: filteredEmergencies,
        })
        openExploreSheet()
    }

    const skeletonLoader = () => {
        return (
            <div className="w-24 flex flex-col items-center space-y-2 animate-pulse">
                <div className="w-[50px] h-[50px] bg-red-100 rounded-full flex items-center justify-center">
                    <div className="w-7 h-7 bg-red-300 rounded-md"></div>
                </div>

                <div className="w-16 h-3 bg-gray-300 rounded"></div>
            </div>
        )
    }

    return (
        <div className="sticky bottom-0 left-0 z-50 w-full h-[100%] py-5 rounded-t-xl bg-white border-t-slate-200">
            <div className="sheet-wrapper">
                <div className="sheet-header mx-4">
                    <PreviewSearchBox />
                </div>
                <div className="sheet-body mt-4">
                    {emergencyTypeLoading && (
                        <div className="grid grid-cols-4 mt-2">
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                            <div>{skeletonLoader()}</div>
                        </div>
                    )}

                    <AvailableServiceList
                        emergencyTypeData={emergencyTypeData}
                        handleServiceClick={handleServiceClick}
                    />
                </div>
            </div>
        </div>
    )
}

export default BottomMenu
