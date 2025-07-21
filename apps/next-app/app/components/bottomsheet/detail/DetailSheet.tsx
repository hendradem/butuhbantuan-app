'use client'
import React, { useEffect, useState } from 'react'
import useDetailSheet from '@/store/useDetailSheet'
import CoreSheet from '../core/CoreSheet'
import HeaderSection from './partials/HeaderSection'
import EmergencyDataSingleList from './partials/EmergencyDataSingleList'
import useLeaflet from '@/store/useLeaflet'

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
        <div>
            <div>
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
                    <div className="sheet mt-2">
                        <EmergencyDataSingleList
                            data={detailSheetData?.emergency}
                        />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default DetailSheet
