'use client'
import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import config from '@/config'
import useMapBox from '@/store/useMapBox'
import useUserLocationData from '@/store/useUserLocationData'
import useExploreSheet from '@/store/useExploreSheet'
import useDetailSheet from '@/store/useDetailSheet'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getDistanceMatrix, getDirectionsRoute } from '@/utils/mapboxMatrix'
import { useAddressInformation } from '@/store/api/location.api'
import { getAddressInfo } from '@/store/api/services/location.service'
import { useEmergencyApi } from '@/store/api/emergency.api'
import useEmergencyData from '@/store/useEmergencyData'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import useSearchSheet from '@/store/useSearchSeet'

type MapsProps = {
    updateLatestLocation?: () => void
}

enum EMERGENCY_TYPE {
    FIRE = 'Fire',
    AMBULANCE = 'Ambulance',
    SAR = 'Sar',
    HOSPITAL = 'Hospital',
}

const MapsV2: React.FC<MapsProps> = () => {
    // ===== states ======
    let mapContainer: any
    const mapWrapper = useRef<any>({})
    const [mapContainerState, setMapContainerState] = useState<any>(null)
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)
    const [filteredLocations, setFilteredLocations] = useState<[]>([])
    // ===== end states ======

    // ===== store ======
    const detailSheet = useDetailSheet()
    const exploreSheet = useExploreSheet()
    const searchSheet = useSearchSheet()
    const { directionRoute, updateDirectionRoute } = useMapBox()
    const { updateEmergencyData, selectedEmergencyData } = useEmergencyData()
    const {
        long: longitudeState,
        lat: latitudeState,
        isRefetchMatrix,
        updateCoordinate,
        updateFullAddress,
    } = useUserLocationData()

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

    const handleMapClick = (e: any) => {
        exploreSheet.onClose()
        detailSheet.onClose()
        searchSheet.onClose()

        const { lng, lat } = e.lngLat
        drawCurrentMarkerLocation(lng, lat)

        // get address info to update address and filter emergency data - [NOTE: Directly use location.service fetcher]
        getAddressInfo(lng, lat).then((res) => {
            const address = res[0]?.place_name
            updateFullAddress(address)
        })

        // remove existing route layer
        removeExistingDirectionLine()
        refetchAddressInfo()
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
        updateCoordinate(latitude, longitude)
        mapContainer = mapContainer ? mapContainer : mapContainerState

        const userLocationMarker = document.getElementsByClassName('marker')
        const el = document.createElement('div')
        el.className = 'marker'

        if (userLocationMarker.length > 0) {
            userLocationMarker[0].remove()
        }

        new mapboxgl.Marker(el) // render a marker
            .setLngLat([longitude, latitude])
            .addTo(mapContainer)

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
                padding: { top: 50, bottom: 300, left: 50, right: 50 },
                maxZoom: 13, // Prevents excessive zoom
                duration: 1000, // Smooth animation (1s)
            }
        )
    }

    const buildTheMap = () => {
        mapContainer = new mapboxgl.Map({
            container: mapWrapper.current,
            style: 'mapbox://styles/mapbox/streets-v10',
            center: [110.3450278, -7.7063721],
            zoom: 12,
            accessToken: config.MAPBOX_API_KEY,
        })

        setMapContainerState(mapContainer) // set mapContainer state to gobal state

        mapContainer.on('load', () => {
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
        })

        mapContainer.on('click', (e: any) => {
            handleMapClick(e)
        })
    }

    useEffect(() => {
        if (addressInfo) {
            const address = addressInfo[0]?.place_name
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
        const coords = selectedEmergencyData?.selectedEmergencyData?.coordinates

        if (
            selectedEmergencyData &&
            Array.isArray(coords) &&
            coords.length === 2
        ) {
            zoomMapIntoSpecificArea(
                [coords[0], coords[1]],
                [longitudeState, latitudeState]
            )
        }
    }, [selectedEmergencyData])

    useEffect(() => {
        buildTheMap()
    }, [emergencyDataLoading])

    useEffect(() => {
        removeExistingDirectionLine()
    }, [exploreSheet.isOpen, detailSheet.isOpen]) // remove direction line when explore or detail sheet open

    useEffect(() => {
        removeExistingDirectionLine()
        drawCurrentMarkerLocation(longitudeState, latitudeState)
    }, [longitudeState, latitudeState]) // draw current marker location when longitude or latitude change

    return (
        <div
            style={{
                width: '100%',
                height: '100vh', // or fixed value e.g., "500px"
                maxHeight: '100vh', // Prevents height from changing on resize
                overflow: 'hidden',
            }}
            ref={(el) => {
                mapWrapper.current = el
                void 0
            }}
        ></div>
    )
}

export default MapsV2
