import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import config from '@/app/config'
import toast from 'react-hot-toast'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { useAddressInformation } from '@/app/store/api/location.api'
import useUserLocationData from '@/app/store/useUserLocationData'
import MainBottomMenu from '../bottommenu/MainBottomMenu'
import { getDistanceMatrix } from '@/app/utils/mapboxMatrix'
import Resultsheet from '../bottomsheet/Resultsheet'
import useEmergencyData from '@/app/store/useEmergencyData'

type MapsProps = {
    mapHeight: string
    updateLatestLocation?: () => void
}

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
    let mapContainer: any
    const emergencyData = useEmergencyData((state) => state.emergencyData)
    const updateEmergencyData = useEmergencyData(
        (action) => action.updateEmergencyData
    )
    const [mapContainerState, setMapContainerState] = useState<any>(null)
    const mapWrapper = useRef<any>()
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)
    const isRefetchMatrix = useUserLocationData(
        (state) => state.isRefetchMatrix
    )
    const longitudeState = useUserLocationData((state) => state.long)
    const latitudeState = useUserLocationData((state) => state.lat)

    const [isGeolocating, setIsGeolocating] = useState<boolean>(false)
    const [currentMarker, setCurrentMarker] = useState<any>(null)

    const [locations, setLocations] = useState(emergencyData)
    // const [convertedLocations, setConvertedLocations] = useState<any>([])

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

    const mapTheMarker = (type: string) => {
        const currentLocationMarker =
            document.getElementsByClassName('ambulance-marker')

        if (type === 'init') {
            console.log('init the marker')

            for (const marker of locations) {
                const el = document.createElement('div')
                el.className = 'ambulance-marker'

                // label
                const label = document.createElement('div')
                label.className = 'marker-label'
                label.style.position = 'absolute'
                label.style.background = 'white'
                label.style.width = '100px'
                label.style.padding = '5px'
                label.style.borderRadius = '8px'
                label.style.fontSize = '11px'
                label.style.marginTop = '-15px'
                label.style.marginLeft = '30px'
                label.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)'

                el.appendChild(label)

                el.addEventListener('click', () => {
                    window.alert(marker.address)
                })

                // Add markers to the map.
                new mapboxgl.Marker(el)
                    .setLngLat([marker.coordinates[0], marker.coordinates[1]])
                    .setPopup()
                    .addTo(mapContainer)
            }
        } else {
            console.log('update the marker')
            // const currentAmbulanceMarkerLabel =
            //     document.getElementsByClassName('marker-label')
            // for (let i = 0; i < currentAmbulanceMarkerLabel.length; i++) {
            //     currentAmbulanceMarkerLabel[i].innerHTML =
            //         `<h3 className=''>${locations[i].name}</h3><p> ${locations[i].distance} km</p> - <p> ${locations[i].duration} min</p>`
            // }
            const currentAmbulanceMarkerLabel =
                document.getElementsByClassName('marker-label')
            // if (currentAmbulanceMarkerLabel.length > 0) {
            //     currentAmbulanceMarkerLabel[0].remove()
            // }
            for (let i = 0; i < currentAmbulanceMarkerLabel.length; i++) {
                // console.log(locations[i].name)
                currentAmbulanceMarkerLabel[i].innerHTML = '123'
                // `<h3 className=''>${locations[i].name}</h3><p> ${locations[i].distance} km</p> - <p> ${locations[i].duration} min</p>`
            }
        }
    }

    const updateMarkerInformation = (data: any) => {
        const currentAmbulanceMarkerLabel =
            document.querySelectorAll('.marker-label')

        if (data) {
            if (currentAmbulanceMarkerLabel.length > locations.length) {
                currentAmbulanceMarkerLabel.forEach((el) => el.remove())
            } else {
                for (let i = 0; i < currentAmbulanceMarkerLabel.length; i++) {
                    currentAmbulanceMarkerLabel[i].innerHTML =
                        `<h3 className='text-orange-200'>${data[i]?.name}</h3><p> <p> ${data[i]?.duration} min</p>`
                }
            }
        }
    }

    const drawCurrentMarkerLocation = (longitude: number, latitude: number) => {
        mapContainer = mapContainer ? mapContainer : mapContainerState

        const userLocationMarker = document.getElementsByClassName('marker')
        const el = document.createElement('div')
        el.className = 'marker'

        if (userLocationMarker.length > 0) {
            userLocationMarker[0].remove()
        }

        // setUserLatitudeAfterGeolocated(latitude)
        // setUserLongitudeAfterGeolocated(longitude)

        let current = new mapboxgl.Marker(el)
            .setLngLat([longitude, latitude])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                )
            )
            .addTo(mapContainer)

        setCurrentMarker(current)
        getMatrixOfLocations(longitude, latitude)

        mapContainer.flyTo({
            center: [longitude, latitude],
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        })
    }

    const getMatrixOfLocations = (longitude: number, latitude: number) => {
        getDistanceMatrix([longitude ?? 0, latitude ?? 0], locations).then(
            (res) => {
                const transformedLocations = res.map((location) => {
                    return {
                        id: location?.id,
                        name: location?.name,
                        coordinates: location?.coordinates,
                        distance: location.matrix.distance,
                        duration: location.matrix.duration,
                    }
                })
                updateMarkerInformation(transformedLocations)
                updateEmergencyData(res)
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

        setMapContainerState(mapContainer)

        mapContainer.on('load', () => {
            if (buildMapType === 'rebuild') {
                console.log('rebuild')
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
                mapTheMarker('update')
            } else {
                console.log('init')
                setIsGeolocating(true)

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
                        mapTheMarker('init')
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
        if (mapContainerState && longitudeState && latitudeState) {
            drawCurrentMarkerLocation(longitudeState, latitudeState)
        }
    }, [isRefetchMatrix])

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
                <Resultsheet
                    emergencyType={{
                        name: 'asdas',
                        icon: 'test',
                        color: 'red',
                    }}
                />
            </div>
        </>
    )
}

export default MapsV2
