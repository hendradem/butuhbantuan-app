import React, { useEffect, useState } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import useEmergencyData from '@/app/store/useEmergencyData'
import { getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import DetailSection from './partials/DetailSection'
import MainSection from './partials/MainSection'

type MapsPropsType = {
    rebuildMap: (arg1: any, arg2: any) => void
}

type emergencyDataType = {
    colorSecondary: string
    colorMain: string
    icon: string
    name: string
}

type selectedEmergencyDataType = {
    emergency_type_name: string | null
    emergency_type_icon: string | null
}

const MainBottomSheet: React.FC<MapsPropsType> = ({ rebuildMap }) => {
    const mainBottomSheet = useMainBottomSheet()
    const sheetRef = React.useRef<BottomSheetRef>(null)
    const isSheetFullscreen = mainBottomSheet.isFullScreen
    const emergencyData = useEmergencyData((state) => state.emergencyData)
    const selectedEmergencyDataState = useEmergencyData(
        (state) => state.selectedEmergencyData
    )
    const updateSelectedEmergencyData = useEmergencyData(
        (action) => action.updateSelectedEmergencyData
    )
    const [selectedEmergencyData, setSelectedEmergencyData] =
        useState<emergencyDataType>()

    const [isDetail, setIsDetail] = useState(false)

    const [filteredEmergencyData, setFilteredEmergencyData] = useState<any>([])

    const [selectedEmergencyType, setSelectedEmergencyType] =
        useState<selectedEmergencyDataType>({
            emergency_type_name: null,
            emergency_type_icon: null,
        })

    const handleSearchInputOnClick = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
        mainBottomSheet.onFullScreen()
    }
    const handleResetBottomSheet = () => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.min(...snapPoints))
    }
    const handleServiceClick = (service?: any) => {
        const serviceID = service?.id

        setSelectedEmergencyType({
            emergency_type_name: service?.emergency_type_name,
            emergency_type_icon: service?.icon,
        })

        const filteredEmergencies = emergencyData.filter((item: any) => {
            return +item.id === serviceID
        })

        setFilteredEmergencyData(filteredEmergencies)
        setSelectedEmergencyData(service)
        setIsDetail(true)
    }
    const handleChangeLocationOnClick = () => {
        setIsDetail(false)
        mainBottomSheet.onFullScreen()
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
    }

    // detail state
    const updateDirectionRoute = useMapBox(
        (action) => action.updateDirectionRoute
    )
    const userLocationLatitude = useUserLocationData((state) => state.lat)
    const userLocationLongitude = useUserLocationData((state) => state.long)
    const [selectedEmergencyName, setSelectedEmergencyName] =
        useState<string>('')

    // details
    const handleSelectedEmergency = async (emergency: any) => {
        setSelectedEmergencyName(emergency?.name) // to trigger focus on list component.
        updateSelectedEmergencyData({
            selectedEmergencyData: emergency,
            selectedEmergencySource: 'detail',
        })
        const directions = await getDirectionsRoute(
            [emergency?.coordinates[0], emergency?.coordinates[1]], // origin coordinate (emergency location)
            [userLocationLongitude, userLocationLatitude] // user location coordinate
        )
        updateDirectionRoute(directions)
        scrollToTop()
    }

    const handleCloseDetailSheet = () => {
        handleResetBottomSheet()
        setIsDetail(false)
        mainBottomSheet.onExitFullScreen()
    }

    const scrollToTop = () => {
        console.log('scroll to top')
    }

    useEffect(() => {
        if (
            selectedEmergencyDataState &&
            selectedEmergencyDataState.selectedEmergencySource == 'map'
        ) {
            const service =
                selectedEmergencyDataState.selectedEmergencyData.EmergencyType

            setSelectedEmergencyType({
                emergency_type_name: service?.emergencyTypeName,
                emergency_type_icon: service?.icon,
            })

            handleServiceClick(selectedEmergencyDataState.selectedEmergencyType)
            handleSelectedEmergency(
                selectedEmergencyDataState.selectedEmergencyData
            )
            scrollToTop()
        }
    }, [selectedEmergencyDataState])

    useEffect(() => {
        if (isSheetFullscreen) {
            sheetRef?.current?.snapTo(({ snapPoints }) =>
                Math.max(...snapPoints)
            )
        } else {
            sheetRef?.current?.snapTo(({ snapPoints }) =>
                Math.min(...snapPoints)
            )
        }
    }, [isSheetFullscreen])

    useEffect(() => {
        setSelectedEmergencyName('')
    }, [emergencyData])

    return (
        <div>
            <div className="bottom-sheet">
                <BottomSheet
                    open={mainBottomSheet.isOpen}
                    ref={sheetRef}
                    snapPoints={({
                        maxHeight,
                        minHeight,
                    }: {
                        maxHeight: number
                        minHeight: number
                    }) => [maxHeight - maxHeight / 10, minHeight + 2]}
                    blocking={false}
                >
                    <div>
                        <div className="sheet">
                            {isDetail && selectedEmergencyData ? (
                                <DetailSection
                                    selectedEmergencyData={
                                        selectedEmergencyData
                                    }
                                    emergencyData={filteredEmergencyData}
                                    emergencyTypeData={selectedEmergencyType}
                                    selectedEmergencyName={
                                        selectedEmergencyName
                                    }
                                    handleChangeLocationOnClick={
                                        handleChangeLocationOnClick
                                    }
                                    handleCloseDetailSheet={
                                        handleCloseDetailSheet
                                    }
                                    handleSelectedEmergency={
                                        handleSelectedEmergency
                                    }
                                />
                            ) : (
                                <MainSection
                                    rebuildMap={rebuildMap}
                                    handleServiceClick={handleServiceClick}
                                    handleResetBottomSheet={
                                        handleResetBottomSheet
                                    }
                                    handleSearchInputOnClick={
                                        handleSearchInputOnClick
                                    }
                                />
                            )}
                        </div>
                    </div>
                </BottomSheet>
            </div>
        </div>
    )
}

export default MainBottomSheet
