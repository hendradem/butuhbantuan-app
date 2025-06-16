'use client'
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import config from '@/app/config'
import toast from 'react-hot-toast'
import useMapBox from '@/app/store/useMapBox'
import useUserLocationData from '@/app/store/useUserLocationData'
import MainBottomSheet from '../bottomsheet/MainBottomSheet'
import DetailBottomSheet from '../bottomsheet/DetailBottomSheet'
import useMainBottomSheet from '@/app/store/useMainBottomSheet'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import { getDistanceMatrix, getDirectionsRoute } from '@/app/utils/mapboxMatrix'
import { useAddressInformation } from '@/app/store/api/location.api'
import { getAddressInfo } from '@/app/store/api/services/location.service'
import { useEmergencyApi } from '@/app/store/api/emergency.api'
import useEmergencyData from '@/app/store/useEmergencyData'
import useDetailSheet from '@/app/store/useDetailSheet'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

type MapsProps = {
    mapHeight: string
    updateLatestLocation?: () => void
}

enum EMERGENCY_TYPE {
    FIRE = 'Fire',
    AMBULANCE = 'Ambulance',
    SAR = 'Sar',
    HOSPITAL = 'Hospital',
}

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
    // ===== states ======
    let mapContainer: any
    const mapWrapper = useRef<any>({})
    const [mapContainerState, setMapContainerState] = useState<any>(null)
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)

    const [currentMarker, setCurrentMarker] = useState<any>(null)
    const [currentRegency, setCurrentRegency] = useState<any>('')
    const [filteredLocations, setFilteredLocations] = useState<[]>([])
    // ===== end states ======

    // ===== store ======
    const detailSheet = useDetailSheet()
    const updateEmergencyData = useEmergencyData(
        (action) => action.updateEmergencyData
    )
    const updateSelectedEmergencyData = useEmergencyData(
        (action) => action.updateSelectedEmergencyData
    )
    const selectedEmergencyDataState = useEmergencyData(
        (state) => state.selectedEmergencyData
    )
    const directionRoute = useMapBox((state) => state.directionRoute)
    const updateDirectionRoute = useMapBox(
        (action) => action.updateDirectionRoute
    )

    const updateCoordinate = useUserLocationData(
        (state) => state.updateCoordinate
    )
    const updateFullAddress = useUserLocationData(
        (state) => state.updateFullAddress
    )

    const isRefetchMatrix = useUserLocationData(
        (state) => state.isRefetchMatrix
    )
    const mainBottomSheet = useMainBottomSheet()
    const longitudeState = useUserLocationData((state) => state.long)
    const latitudeState = useUserLocationData((state) => state.lat)
    const regencyState = useUserLocationData((state) => state.regency)

    // ===== end store ======

    // ===== api ======
    const { getEmergencyData, emergencyDataLoading } = useEmergencyApi()
    const { data: addressInfo, refetch: refetchAddressInfo } =
        useAddressInformation(
            userLongitudeAfterGeolocated ? userLongitudeAfterGeolocated : 0,
            userLatitudeAfterGeolocated ? userLatitudeAfterGeolocated : 0
        )
    // ===== end api ======

    const mapTheMarker = (): void => {
        if (filteredLocations.length > 0) {
            // Clear existing markers if needed
            document
                .querySelectorAll('.ambulance-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.fire-fighter-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.sar-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.hospital-marker')
                .forEach((marker) => marker.remove())

            filteredLocations.map((marker: any) => {
                const el = document.createElement('div')

                if (marker.organizationType == EMERGENCY_TYPE.AMBULANCE) {
                    el.className = 'ambulance-marker'
                } else if (marker.organizationType == EMERGENCY_TYPE.FIRE) {
                    el.className = 'fire-fighter-marker'
                } else if (marker.organizationType == EMERGENCY_TYPE.SAR) {
                    el.className = 'sar-marker'
                } else if (marker.organizationType == EMERGENCY_TYPE.HOSPITAL) {
                    el.className = 'hospital-marker'
                }

                // Add markers to the map.
                new mapboxgl.Marker(el)
                    .setLngLat([marker.coordinates[0], marker.coordinates[1]])
                    .addTo(mapContainer ? mapContainer : mapContainerState)

                el.addEventListener('click', async (e: any) => {
                    e.stopPropagation()

                    handleMarkerClick(marker)
                })
            })
        } else {
            document
                .querySelectorAll('.ambulance-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.fire-fighter-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.sar-marker')
                .forEach((marker) => marker.remove())

            document
                .querySelectorAll('.hospital-marker')
                .forEach((marker) => marker.remove())
        }
    }

    const handleMarkerClick = async (marker: any) => {
        // update selected emergency data
        detailSheet.onOpen()
        detailSheet.setDetailSheetData({
            emergencyType: marker.EmergencyType,
            emergency: marker,
        })

        // get directions from marker location to user location
        const directions = await getDirectionsRoute(
            [marker.coordinates[0], marker.coordinates[1]], // origin coordinate (emergency location)
            [
                longitudeState ? longitudeState : userLongitudeAfterGeolocated,
                latitudeState ? latitudeState : userLatitudeAfterGeolocated,
            ] // user location coordinate
        )

        updateDirectionRoute(directions)
        zoomMapIntoSpecificArea(
            [marker.coordinates[0], marker.coordinates[1]],
            [longitudeState, latitudeState]
        )
    }

    const drawCurrentMarkerLocation = (longitude: number, latitude: number) => {
        console.log('draw current marker called')
        updateCoordinate(latitude, longitude)
        mapContainer = mapContainer ? mapContainer : mapContainerState

        const userLocationMarker = document.getElementsByClassName('marker')
        const el = document.createElement('div')
        el.className = 'marker'

        if (userLocationMarker.length > 0) {
            userLocationMarker[0].remove()
        }

        let current = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .addTo(mapContainer)

        setCurrentMarker(current)
        getMatrixOfLocations(longitude, latitude)

        mapContainer.flyTo({
            center: [longitude, latitude],
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        })
    }

    const getMatrixOfLocations = (longitude: number, latitude: number) => {
        getDistanceMatrix(
            [longitude ?? 0, latitude ?? 0],
            getEmergencyData?.data
        ).then((res) => {
            // updateMarkerInformation(transformedLocations)
            updateEmergencyData(res) // update global emergency state
            setFilteredLocations(res as any) // update emergency state
        })
    }

    const drawDirectionLine = (route: any): void => {
        if (mapContainerState.getLayer('route')) {
            mapContainerState.removeLayer('route') // Remove the line layer
        }
        if (mapContainerState.getSource('route')) {
            mapContainerState.removeSource('route') // Remove the data source
        }

        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route,
            },
        }

        mapContainerState.addLayer({
            id: 'route',
            type: 'line',
            source: {
                type: 'geojson',
                data: geojson,
            },
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#3b82f6',
                'line-width': 5,
                'circle-radius': 10,
                'circle-color': '#f30',
            },
        })
    }

    const removeExistingDirectionLine = () => {
        let map = mapContainer ? mapContainer : mapContainerState
        const routeSource = map.getSource('route')

        if (routeSource) {
            routeSource.setData({
                type: 'FeatureCollection',
                features: [],
            })
        }
    }

    const zoomMapIntoSpecificArea = (
        origin: [number, number],
        destination: [number, number]
    ) => {
        mapContainerState.fitBounds(
            [
                [origin[0], origin[1]],
                [destination[0], destination[1]],
            ],
            {
                padding: { top: 50, bottom: 400, left: 50, right: 50 },
                maxZoom: 13, // Prevents excessive zoom
                duration: 1000, // Smooth animation (1s)
            }
        )
    }

    const buildTheMap = (
        buildMapType?: string,
        coordinates?: { lat: number; long: number }
    ) => {
        mapContainer = new mapboxgl.Map({
            container: mapWrapper.current,
            style: 'mapbox://styles/mapbox/streets-v10',
            center: coordinates
                ? [coordinates.long, coordinates.lat]
                : [110.3450278, -7.7063721],
            zoom: 12,
            accessToken: config.MAPBOX_API_KEY,
        })

        setMapContainerState(mapContainer) // set mapContainer state to gobal state

        mapContainer.on('load', () => {
            if (buildMapType === 'rebuild') {
                drawCurrentMarkerLocation(
                    coordinates?.long ?? 0,
                    coordinates?.lat ?? 0
                )
                refetchAddressInfo()
                getMatrixOfLocations(
                    coordinates?.long ?? 0,
                    coordinates?.lat ?? 0
                )
            } else {
                getCurrentLocation((location: any) => {
                    const userLatitude = location?.lat
                    const userLongitude = location?.lng

                    if (userLatitude && userLongitude) {
                        refetchAddressInfo()
                        setUserLatitudeAfterGeolocated(userLatitude)
                        setUserLongitudeAfterGeolocated(userLongitude)
                        drawCurrentMarkerLocation(userLongitude, userLatitude)
                        getMatrixOfLocations(userLongitude, userLatitude)
                    }
                })
            }
        })

        mapContainer.on('click', (e: any) => {
            const { lng, lat } = e.lngLat
            drawCurrentMarkerLocation(lng, lat)

            // get address info to update address and filter emergency data - [NOTE: Directly use location.service fetcher]
            getAddressInfo(lng, lat).then((res) => {
                const regency = res[3]?.text
                const address = res[0]?.place_name
                setCurrentRegency(regency)
                updateFullAddress(address)
            })

            // remove existing route layer
            removeExistingDirectionLine()
            refetchAddressInfo()
        })
    }

    useEffect(() => {
        if (addressInfo) {
            const regency = addressInfo[3]?.text
            const address = addressInfo[0]?.place_name
            setCurrentRegency(regency)
            updateFullAddress(address)
        }
    }, [addressInfo])

    useEffect(() => {
        mapTheMarker()
    }, [filteredLocations])

    useEffect(() => {
        if (mapContainerState && longitudeState && latitudeState) {
            removeExistingDirectionLine()
            drawCurrentMarkerLocation(longitudeState, latitudeState)
        }
    }, [isRefetchMatrix])

    useEffect(() => {
        refetchAddressInfo()
    }, [userLatitudeAfterGeolocated, userLongitudeAfterGeolocated])

    useEffect(() => {
        if (directionRoute.length > 0) {
            drawDirectionLine(directionRoute)
        }
    }, [directionRoute])

    useEffect(() => {
        const coords =
            selectedEmergencyDataState?.selectedEmergencyData?.coordinates

        if (
            selectedEmergencyDataState &&
            selectedEmergencyDataState.selectedEmergencySource === 'detail' &&
            Array.isArray(coords) &&
            coords.length === 2
        ) {
            zoomMapIntoSpecificArea(
                [coords[0], coords[1]],
                [longitudeState, latitudeState]
            )
        }
    }, [selectedEmergencyDataState])

    useEffect(() => {
        buildTheMap()
    }, [emergencyDataLoading])

    useEffect(() => {
        console.log('exit')
        removeExistingDirectionLine()
    }, [mainBottomSheet.onExitFullScreen])

    return (
        <>
            <div>
                <div
                    className="w-full"
                    style={{ height: '100vh' }}
                    ref={(el) => {
                        mapWrapper.current = el
                        void 0
                    }}
                ></div>
                <div>
                    <MainBottomSheet rebuildMap={buildTheMap} />
                    <DetailBottomSheet />
                </div>
            </div>
        </>
    )
}

export default MapsV2
