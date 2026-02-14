'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import useExploreSheet from '@/store/useExploreSheet'
import HeaderSection from './partials/HeaderSection'
import ContentSection from './partials/ContentSection'

const ExploreDetailSheet = () => {
    const { isOpen } = useExploreSheet()
    const snapPoints = [280, 0]

    return (
        <div data-testid="explore-detail-sheet">
            <div className="w-full absolute">
                <CoreSheet
                    isOpen={isOpen}
                    snapPoints={snapPoints}
                    header={<HeaderSection />}
                >
                    <div
                        data-testid="explore-detail-sheet-content"
                        className="sheet-content"
                    >
                        <ContentSection />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default ExploreDetailSheet
