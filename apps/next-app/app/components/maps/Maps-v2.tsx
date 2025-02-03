import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import SearchBox from './SearchBox'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import config from '@/app/config'
import toast from 'react-hot-toast'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useAddressInformation } from '@/app/store/api/location.api'
import useUserLocationData from '@/app/store/useUserLocationData'
import MainBottomMenu from '../bottommenu/MainBottomMenu'

type MapsProps = {
    mapHeight: string
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

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
    let mapContainer: any
    const mapWrapper = useRef<any>()
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)
    const [isGeolocating, setIsGeolocating] = useState<boolean>(false)
    const [geolocationControl, setGeolocationControl] = useState<any>(null)

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

    const buildTheMap = (
        buildMapType?: string,
        coordinates?: { lat: number; long: number }
    ) => {
        console.log(buildMapType)

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

                const el = document.createElement('div')
                el.className = 'marker'

                new mapboxgl.Marker(el)
                    .setLngLat([coordinates?.long ?? 0, coordinates?.lat ?? 0])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 }).setHTML(
                            `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                        )
                    )
                    .addTo(mapContainer)

                mapContainer.flyTo({
                    center: [coordinates?.long, coordinates?.lat],
                    essential: true, // this animation is considered essential with respect to prefers-reduced-motion
                })
            } else {
                setIsGeolocating(true)
                console.log('init')

                navigator.geolocation.watchPosition((position) => {
                    const userLatitude = position?.coords?.latitude
                    const userLongitude = position?.coords?.longitude

                    if (userLatitude && userLongitude) {
                        refetchAddressInfo()
                        setIsGeolocating(false)
                        setUserLatitudeAfterGeolocated(userLatitude)
                        setUserLongitudeAfterGeolocated(userLongitude)

                        const el = document.createElement('div')
                        el.className = 'marker'

                        const userLocationMarker =
                            document.getElementsByClassName('marker')

                        if (userLocationMarker.length > 0) {
                            userLocationMarker[0].remove()
                        }

                        new mapboxgl.Marker(el)
                            .setLngLat([userLongitude ?? 0, userLatitude ?? 0])
                            .setPopup(
                                new mapboxgl.Popup({ offset: 25 }).setHTML(
                                    `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                                )
                            )
                            .addTo(mapContainer)

                        mapContainer.flyTo({
                            center: [userLongitude, userLatitude],
                            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
                        })
                    }
                })
            }
        })
    }

    useEffect(() => {
        buildTheMap('init')
    }, [])

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
            {/* <SearchBox rebuildMap={buildTheMap} /> */}
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
