'use client'
import React, { useEffect, useState } from 'react'
import useDetailSheet from '@/store/useDetailSheet'
import useLeaflet from '@/store/useLeaflet'
import CoreSheet from '../core/CoreSheet'
import HeaderSection from './partials/HeaderSection'
import EmergencyDataSingleList from './partials/EmergencyDataSingleList'

const DetailSheet = () => {
    const [isOpen, setIsOpen] = useState(true)
    const { resetLeafletRouting } = useLeaflet()
    const detailSheet = useDetailSheet()
    const detailSheetData = detailSheet.detailSheetData
    const handleCloseDetailSheet = (): void => {
        detailSheet.onClose()
        resetLeafletRouting()
    }

    useEffect(() => {
        setIsOpen(detailSheet.isOpen)
    }, [detailSheet.isOpen])

    return (
        <div data-testid="detail-sheet">
            <CoreSheet
                isOpen={isOpen}
                header={
                    <HeaderSection
                        data={detailSheetData}
                        handleCloseDetailSheet={handleCloseDetailSheet}
                    />
                }
                snapPoints={[250, 0]}
            >
                <div data-testid="detail-sheet-content" className="sheet mt-2">
                    <EmergencyDataSingleList
                        data={detailSheetData?.emergency}
                    />
                </div>
            </CoreSheet>
        </div>
    )
}

export default DetailSheet
