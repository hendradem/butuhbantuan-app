'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import useSearchSheet from '@/app/store/useSearchSeet'
import HeaderSection from './partials/HeaderSection'
import MainSearchBox from '@/app/components/search/main/MainSearchBox'

const SearchSheet = () => {
    const { isOpen, snapPoint } = useSearchSheet()

    return (
        <div>
            <div className="bottom-sheet">
                <CoreSheet
                    isOpen={isOpen}
                    header={<HeaderSection />}
                    initialSnap={snapPoint}
                >
                    <div className="sheet-content h-full px-2 mt-3 overflow-y-scroll">
                        <MainSearchBox />

                        <div className="quick-link">
                            {snapPoint === 0 && (
                                <div className="w-full mt-5 h-[50px] rounded-xl border border-gray-200">
                                    .
                                </div>
                            )}
                        </div>
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default SearchSheet
