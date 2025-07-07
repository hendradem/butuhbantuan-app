'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import useExploreSheet from '@/store/useExploreSheet'
import HeaderSection from './partials/HeaderSection'
import ContentSection from './partials/ContentSection'

const ExploreDetailSheet = () => {
    const { isOpen } = useExploreSheet()

    const snapPoints = [300, 0]

    return (
        <div>
            <div className="w-full bg-orange-200 absolute">
                <CoreSheet
                    isOpen={isOpen}
                    snapPoints={snapPoints}
                    header={<HeaderSection />}
                >
                    <div className="sheet-content bg-purple-200">
                        <ContentSection />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default ExploreDetailSheet
