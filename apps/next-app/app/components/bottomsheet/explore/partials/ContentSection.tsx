import React, { useState } from 'react'
import EmergencyDataList from '../../partials/EmergencyDataList'
import useExploreSheet from '@/store/useExploreSheet'
import useMapBox from '@/store/useMapBox'
import { getDirectionsRoute } from '@/utils/mapboxMatrix'
import useUserLocationData from '@/store/useUserLocationData'
import useEmergencyData from '@/store/useEmergencyData'
import EmptyState from '@/components/commons/EmptyState'
import useSearchSheet from '@/store/useSearchSeet'

const ContentSection = () => {
    const exploreSheet = useExploreSheet()
    const searchSheet = useSearchSheet()
    const emergencyData = exploreSheet.sheetData?.emergency
    const userLatitude = useUserLocationData((state) => state.lat)
    const userLongitude = useUserLocationData((state) => state.long)
    const { updateDirectionRoute } = useMapBox()
    const { updateSelectedEmergencyData } = useEmergencyData()

    const [selectedEmergencyName, setSelectedEmergencyName] = useState('')

    const handleSelectedEmergency = async (emergency: any) => {
        const emergencyName = emergency?.name
        setSelectedEmergencyName(emergencyName)

        updateSelectedEmergencyData({
            selectedEmergencyData: emergency,
            selectedEmergencySource: 'map',
        })

        const directions = await getDirectionsRoute(
            [emergency?.coordinates[0], emergency?.coordinates[1]], // emergency coordinates
            [userLongitude, userLatitude] // user coordinates from store
        )
        updateDirectionRoute(directions)
    }

    const handleOpenSearchSheet = () => {
        exploreSheet.onClose()
        searchSheet.onOpen()
    }

    const ctaComponent = () => {
        return (
            <div className="flex items-center justify-center mt-2">
                <button
                    onClick={() => handleOpenSearchSheet()}
                    type="button"
                    className="btn-dark"
                >
                    Ubah pencarian
                </button>
                <button
                    onClick={() => exploreSheet.onClose()}
                    type="button"
                    className="btn-base"
                >
                    Cari di maps
                </button>
            </div>
        )
    }

    return (
        <div>
            <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll">
                <div>
                    {emergencyData?.length == 0 && (
                        <EmptyState
                            size="xxs"
                            title="Data Tidak Ditemukan"
                            cta={ctaComponent()}
                        />
                    )}
                </div>
                <div className="max-h-[210px] pt-3 overflow-y-scroll">
                    <EmergencyDataList
                        emergencyData={emergencyData}
                        handleSelectedEmergency={async (emergency: any) => {
                            handleSelectedEmergency(emergency)
                        }}
                        selectedEmergencyName={selectedEmergencyName}
                    />
                </div>
            </div>
        </div>
    )
}

export default ContentSection
