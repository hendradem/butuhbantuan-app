import React, { useState } from 'react'
import EmergencyDataList from '../../partials/EmergencyDataList'
import useExploreSheet from '@/app/store/useExploreSheet'
import useMapBox from '@/app/store/useMapBox'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useUserLocationData from '@/app/store/useUserLocationData'
import useEmergencyData from '@/app/store/useEmergencyData'

const ContentSection = () => {
    const exploreSheet = useExploreSheet()
    const emergencyData = exploreSheet.sheetData?.emergency
    const userLatitude = useUserLocationData((state) => state.lat)
    const userLongitude = useUserLocationData((state) => state.long)
    const updateRoute = useMapBox((action) => action.updateDirectionRoute)
    const updateSelectedEmergencyData = useEmergencyData(
        (action) => action.updateSelectedEmergencyData
    )

    const [selectedEmergencyName, setSelectedEmergencyName] = useState('')

    const handleChangeLocation = () => {
        console.log('clicked')
    }

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
        updateRoute(directions)
    }

    return (
        <div>
            <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll max-h-[250px]">
                <div className="mt-5">
                    {emergencyData?.length == 0 && (
                        <div className="mx-3 mb-3 text-center text-slate-900">
                            Data emergency tidak ditemukan
                            <div>
                                <button
                                    onClick={() => handleChangeLocation()}
                                    type="button"
                                    className="border focus:outline-none  focus:ring-4 font-medium rounded-lg text-sm mt-2 px-4 py-2 me-2 mb-2 bg-gray-800 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-600 focus:ring-gray-700"
                                >
                                    Ubah Lokasi Pencarian
                                </button>
                            </div>
                        </div>
                    )}

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
