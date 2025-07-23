'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import MapRoutingHandler from './map-routing-handler'
import MapClickHandler from './map-click-handler'
import useErrorSheet from '@/store/useErrorSheet'
import useUserLocationData from '@/store/useUserLocationData'
import toast from 'react-hot-toast'
import useEmergency from '@/store/useEmergency'
import { getUserLocation } from '@/utils/geocoding'
import useExploreSheet from '@/store/useExploreSheet'
import useLeaflet from '@/store/useLeaflet'
import useDetailSheet from '@/store/useDetailSheet'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import MapViewHandler from './map-view-handler'
import useSearchData from '@/store/useSearchData'
import { getEmergencyData } from '@/store/api/emergency.api'

const markerIcon = (marker_type: string) => {
    const classNameMap: Record<string, string> = {
        Ambulance: 'ambulance-marker',
        Damkar: 'fire-fighter-marker',
        SAR: 'sar-marker',
    }

    const className = classNameMap[marker_type] || 'current-location-marker'

    return L.divIcon({
        className,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    })
}

export default function LeafletMaps() {
    const [clickedLatLng, setClickedLatLng] = useState<any>(null)
    const isErrorSheetOpen = useErrorSheet((state) => state.isOpen)
    const { lat: addressLat, lng: addressLng } = useSearchData()
    const { onClose: closeConfirmationSheet } = useConfirmationSheet()
    const filteredEmergency = useEmergency((state) => state.filteredEmergency)
    const { isGetCurrentLocation, updateIsGetCurrentLocation } =
        useUserLocationData()
    const { onClose: closeExploreSheet } = useExploreSheet()
    const { updateLeafletRouting, resetLeafletRouting } = useLeaflet()
    const mapZoom = useLeaflet((state) => state.zoom)
    const setMapZoom = useLeaflet((state) => state.setMapZoom)
    const {
        onOpen: openDetailSheet,
        onClose: closeDetailSheet,
        setDetailSheetData,
    } = useDetailSheet()

    const handleMapClick = async (latlng: [number, number]) => {
        setClickedLatLng(latlng)
        clearDirectionsLine()
        closeExploreSheet()
        closeDetailSheet()
        closeConfirmationSheet()
        getNearestEmergencyData(latlng)
        setMapZoom(12)
    }

    const getNearestEmergencyData = async (latlng: [number, number]) => {
        try {
            getEmergencyData(latlng)
        } catch (err) {
            toast.error('Terjadi kesalahan saat mengambil data.')
        }
    }
    const handlerEmergencyMarkerClick = (emergency: any) => {
        const markerData = emergency?.emergencyData

        closeDetailSheet()
        setDetailSheetData({
            emergencyType: markerData.emergency_type,
            emergency: emergency,
        })
        openDetailSheet()

        updateLeafletRouting({
            startPoint: {
                lat: +markerData.coordinates[1],
                lng: +markerData.coordinates[0],
            },
            routeEndPoint: {
                lat: clickedLatLng?.[0],
                lng: clickedLatLng?.[1],
            },
        })
    }

    const clearDirectionsLine = () => {
        resetLeafletRouting()
    }

    const getCurrentUserLocation = async () => {
        const locationResult = await getUserLocation()

        if (locationResult?.data) {
            const { lat, long } = locationResult?.data
            setClickedLatLng([lat, long])
            handleMapClick([lat, long])
        }
    }

    useEffect(() => {
        if (isGetCurrentLocation) {
            getCurrentUserLocation()
            updateIsGetCurrentLocation(false)
        }

        if (addressLat && addressLng) {
            handleMapClick([addressLat, addressLng])
        }
    }, [isGetCurrentLocation, addressLat])

    useEffect(() => {
        getCurrentUserLocation()
    }, [])

    return (
        <>
            {clickedLatLng && (
                <MapContainer
                    center={[clickedLatLng?.[0], clickedLatLng?.[1]]}
                    // zoom={mapZoom}
                    scrollWheelZoom={true}
                    style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: '100vh', // Prevents height from changing on resize
                        zIndex: 99,
                    }}
                >
                    <TileLayer
                        // url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
                        // url="https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png"
                        // url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                        // url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                        attribution='&copy; <a href="butuhbantuan.com">Butuhbantuan</a>'
                    />

                    <MapRoutingHandler />
                    <MapClickHandler onClick={handleMapClick} />
                    <MapViewHandler latlng={clickedLatLng} />

                    {clickedLatLng && !isErrorSheetOpen && (
                        <Marker
                            position={clickedLatLng}
                            icon={markerIcon('current-location-marker')}
                        >
                            <Popup>
                                <p>Latitude: {clickedLatLng[0]}</p>
                                <p>Longitude: {clickedLatLng[1]}</p>
                            </Popup>
                        </Marker>
                    )}

                    {filteredEmergency
                        ? filteredEmergency?.map((data: any) => {
                              const markerData = data?.emergencyData
                              return (
                                  <Marker
                                      position={[
                                          +markerData.coordinates[1],
                                          +markerData.coordinates[0],
                                      ]}
                                      icon={markerIcon(
                                          markerData.organization_type
                                      )}
                                      key={`${markerData.id}-${markerData.coordinates.join(',')}`}
                                      eventHandlers={{
                                          click: () => {
                                              handlerEmergencyMarkerClick(data)
                                          },
                                      }}
                                  ></Marker>
                              )
                          })
                        : null}
                </MapContainer>
            )}
        </>
    )
}
