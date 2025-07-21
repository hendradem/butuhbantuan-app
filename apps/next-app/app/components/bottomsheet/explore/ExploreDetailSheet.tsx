'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import useExploreSheet from '@/store/useExploreSheet'
import HeaderSection from './partials/HeaderSection'
import ContentSection from './partials/ContentSection'

const ExploreDetailSheet = () => {
    const { isOpen } = useExploreSheet()

    const snapPoints = [330, 0]

    return (
        <div>
            <div className="w-full absolute">
                <CoreSheet
                    isOpen={isOpen}
                    snapPoints={snapPoints}
                    header={<HeaderSection />}
                >
                    <div className="sheet-content">
                        <ContentSection />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default ExploreDetailSheet
