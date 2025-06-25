'use client'
import React from 'react'
import Maps from '../components/maps/Maps-v2'
import BottomMenu from '../components/menu/BottomMenu'
import DetailSheet from '../components/bottomsheet/detail/DetailSheet'
import ExploreDetailSheet from '../components/bottomsheet/explore/ExploreDetailSheet'
import SearchSheet from '../components/bottomsheet/search/SearchSheet'

export default function EmergencyPage() {
    return (
        <>
            <div className="h-screen bg-white overflow-hidden">
                <div className="h-[80%]">
                    <Maps />
                </div>

                <div className="h-[20%] bottom-0 left-0 right-0 z-50">
                    <BottomMenu />
                </div>
            </div>

            <div className="sheet w-[100px] bg-orange-200">
                <DetailSheet />
                <ExploreDetailSheet />
                <SearchSheet />
            </div>
        </>
    )
}
