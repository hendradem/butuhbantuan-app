import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import config from '@/app/config'
import toast from 'react-hot-toast'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useAddressInformation } from '@/app/store/api/location.api'
import useUserLocationData from '@/app/store/useUserLocationData'
import MainBottomMenu from '../bottommenu/MainBottomMenu'
import { getDistanceMatrix } from '@/app/utils/mapboxMatrix'

import { Location } from '@/app/utils/mapboxMatrix'

type MapsProps = {
    mapHeight: string
}

interface LocationWithDistance extends Location {
    duration?: number
}

const geojson = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                message: 'PSC SES 119',
                imageId: 1011,
                iconSize: [30, 30],
            },
            geometry: {
                type: 'Point',
                coordinates: [110.3539151, -7.718647],
            },
        },
        {
            type: 'Feature',
            properties: {
                message: 'PMI Kab. Sleman',
                imageId: 837,
                iconSize: [30, 30],
            },
            geometry: {
                type: 'Point',
                coordinates: [110.3450278, -7.7063721],
            },
        },
    ],
}

const SAMPLE_LOCATIONS: Location[] = [
    {
        id: '1',
        name: 'PSC SES',
        coordinates: [110.3539, -7.7186],
        address: 'Sleman',
    },
    {
        id: '2',
        name: 'PMI Sleman',
        coordinates: [110.345, -7.7063],
        address: 'Sleman',
    },
]

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
    let mapContainer: any
    const mapWrapper = useRef<any>()
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)
    const [isGeolocating, setIsGeolocating] = useState<boolean>(false)
    const [currentMarker, setCurrentMarker] = useState<any>(null)

    const [stakeholders, setStakeHolders] = useState<any>(null)

    const [locations, setLocations] =
        useState<LocationWithDistance[]>(SAMPLE_LOCATIONS)

    // global state
    const updateCoordinate = useUserLocationData(
        (state) => state.updateCoordinate
    )
    const updateFullAddress = useUserLocationData(
        (state) => state.updateFullAddress
    )

    const { data: addressInfo, refetch: refetchAddressInfo } =
        useAddressInformation(
            userLongitudeAfterGeolocated ? userLongitudeAfterGeolocated : 0,
            userLatitudeAfterGeolocated ? userLatitudeAfterGeolocated : 0
        )

    if (addressInfo) {
        const resLatitude = addressInfo[0]?.center[1]
        const resLongitude = addressInfo[0]?.center[0]
        const address = addressInfo[0]?.place_name

        // updating global state
        updateCoordinate(resLatitude, resLongitude)
        updateFullAddress(address)
    }

    const mapTheMarker = () => {
        for (const marker of geojson.features) {
            const el = document.createElement('div')
            el.className = 'ambulance-marker'

            el.addEventListener('click', () => {
                window.alert(marker.properties.message)
            })

            // Add markers to the map.
            new mapboxgl.Marker(el)
                .setLngLat([
                    marker.geometry.coordinates[0],
                    marker.geometry.coordinates[1],
                ])
                .setPopup()
                .addTo(mapContainer)
        }
    }

    const drawCurrentMarkerLocation = (longitude: number, latitude: number) => {
        if (currentMarker) {
            currentMarker.remove()
        }

        const userLocationMarker = document.getElementsByClassName('marker')
        const el = document.createElement('div')
        el.className = 'marker'

        if (userLocationMarker.length > 0) {
            userLocationMarker[0].remove()
        }

        setUserLatitudeAfterGeolocated(latitude)
        setUserLongitudeAfterGeolocated(longitude)

        let current = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                )
            )
            .addTo(mapContainer)

        setCurrentMarker(current)

        mapContainer.flyTo({
            center: [longitude, latitude],
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        })
    }

    const getMatrixOfLocations = (longitude: number, latitude: number) => {
        getDistanceMatrix([longitude ?? 0, latitude ?? 0], locations).then(
            (res) => {
                console.log(res)
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

        mapTheMarker()

        mapContainer.on('load', () => {
            if (buildMapType === 'rebuild') {
                console.log('rebuild the map')
                drawCurrentMarkerLocation(
                    coordinates?.long ?? 0,
                    coordinates?.lat ?? 0
                )
                refetchAddressInfo()
                setIsGeolocating(false)

                getMatrixOfLocations(
                    coordinates?.long ?? 0,
                    coordinates?.lat ?? 0
                )
            } else {
                setIsGeolocating(true)
                console.log('init')

                getCurrentLocation((location: any) => {
                    const userLatitude = location?.lat
                    const userLongitude = location?.lng

                    if (userLatitude && userLongitude) {
                        setIsGeolocating(false)
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
        })
    }

    useEffect(() => {
        buildTheMap('init')
    }, [])

    useEffect(() => {
        refetchAddressInfo()
    }, [userLatitudeAfterGeolocated, userLongitudeAfterGeolocated])

    useEffect(() => {
        if (isGeolocating) {
            toast.loading('Getting your location', {
                style: {
                    borderRadius: '20px',
                    background: '#333',
                    color: '#fff',
                },
            })
        }

        if (
            !isGeolocating &&
            userLatitudeAfterGeolocated &&
            userLongitudeAfterGeolocated
        ) {
            toast.dismiss()
            toast.success('Your location found!', {
                style: {
                    borderRadius: '20px',
                    background: '#333',
                    color: '#fff',
                },
                duration: 500,
            })
        }
    }, [isGeolocating])

    return (
        <>
            <div
                className="w-full"
                style={{ height: mapHeight }}
                ref={(el) => (mapWrapper.current = el)}
            ></div>
            <div>
                <MainBottomMenu rebuildMap={buildTheMap} />
            </div>
        </>
    )
}

export default MapsV2
