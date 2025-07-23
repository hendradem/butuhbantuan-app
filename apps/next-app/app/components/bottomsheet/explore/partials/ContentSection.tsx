import React, { useState } from 'react'
import EmergencyDataList from '../../partials/EmergencyDataList'
import useExploreSheet from '@/store/useExploreSheet'
import useUserLocationData from '@/store/useUserLocationData'
import useEmergencyData from '@/store/useEmergencyData'
import useEmergency from '@/store/useEmergency'
import useLeaflet from '@/store/useLeaflet'

const ContentSection = () => {
    const { sheetData } = useExploreSheet()
    const { dispatcherData } = useEmergencyData()
    const { lat: userLat, long: userLong } = useUserLocationData()
    const { setSelectedEmergency } = useEmergency()
    const { updateLeafletRouting } = useLeaflet()

    const [selectedEmergencyName, setSelectedEmergencyName] = useState('')

    const handleSelectedEmergency = async (emergency: any) => {
        const emergencyName = emergency?.name
        setSelectedEmergencyName(emergencyName)

        // update global state
        setSelectedEmergency(emergency.emergencyData)
        updateLeafletRouting({
            startPoint: {
                lat: emergency?.coordinates[1],
                lng: emergency?.coordinates[0],
            },
            routeEndPoint: {
                lat: userLat,
                lng: userLong,
            },
        })
    }

    return (
        <div>
            <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll">
                <div className="max-h-[280px] bg-white pt-3 pb-8 overflow-y-scroll">
                    <EmergencyDataList
                        emergencyData={sheetData?.emergency}
                        handleSelectedEmergency={async (emergency: any) => {
                            handleSelectedEmergency(emergency)
                        }}
                        selectedEmergencyName={selectedEmergencyName}
                        dispatcherData={dispatcherData.data}
                    />
                </div>
            </div>
        </div>
    )
}

export default ContentSection
