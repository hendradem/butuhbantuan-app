'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import useExploreSheet from '@/app/store/useExploreSheet'
import HeaderSection from './partials/HeaderSection'
import ContentSection from './partials/ContentSection'

const ExploreDetailSheet = () => {
    const { isOpen } = useExploreSheet()

    return (
        <div>
            <div className="bottom-sheet">
                <CoreSheet isOpen={isOpen} header={<HeaderSection />}>
                    <div className="sheet-content">
                        <ContentSection />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default ExploreDetailSheet
