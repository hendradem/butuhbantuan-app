'use client'
import React, { useEffect, useState } from 'react'
import useDetailSheet from '@/app/store/useDetailSheet'
import CoreSheet from '../core/CoreSheet'
import HeaderSection from './partials/HeaderSection'
import EmergencyDataSingleList from './partials/EmergencyDataSingleList'

const DetailSheet = () => {
    const [isOpen, setIsOpen] = useState(true)
    const emergencyData = useDetailSheet((state) => state.detailSheetData)
    const detailSheet = useDetailSheet()
    const handleCloseDetailSheet = (): void => {
        detailSheet.onClose()
    }

    useEffect(() => {
        console.log(emergencyData)
    }, [emergencyData])

    useEffect(() => {
        setIsOpen(detailSheet.isOpen)
    }, [detailSheet.isOpen])

    return (
        <div>
            <div className="bottom-sheet">
                <CoreSheet
                    isOpen={isOpen}
                    header={
                        <HeaderSection
                            emergencyData={emergencyData}
                            handleCloseDetailSheet={handleCloseDetailSheet}
                        />
                    }
                >
                    <div className="sheet mt-2">
                        <EmergencyDataSingleList
                            emergencyData={emergencyData?.emergency}
                        />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default DetailSheet
