import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import SearchBox from './SearchBox'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import config from '@/app/config'
import toast from 'react-hot-toast'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import useAddressInfoApi from '@/app/store/api/useAddressInfoApi'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

type MapsProps = {
    mapHeight: string
}

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
    let mapContainer: any
    const mapWrapper = useRef<any>()
    const [startLatitude, setStartLatitude] = useState(-7.7063721)
    const [startLongitude, setStartLongitude] = useState(110.3450278)
    const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
        useState<number>(0)
    const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
        useState<number>(0)

    const [isGeolocating, setIsGeolocating] = useState<boolean>(false)
    const [geolocationControl, setGeolocationControl] = useState<any>(null)

    const [isFetching, setIsFetching] = useState<boolean>(false)

    const { addressData, addressError } = useAddressInfoApi(
        userLongitudeAfterGeolocated,
        userLatitudeAfterGeolocated
    )

    const retrievePosts = async () => {
        const response = await axios.get(
            'https://jsonplaceholder.typicode.com/posts'
        )
        return response.data
    }

    const {
        data: posts,
        error,
        isLoading,
    } = useQuery(['postsData'], retrievePosts, {
        enabled: isFetching,
    })

    if (isLoading) console.log(isLoading)
    if (error) console.log(error)
    console.log(posts)

    const buildTheMap = async () => {
        mapContainer = new mapboxgl.Map({
            container: mapWrapper.current,
            style: 'mapbox://styles/mapbox/streets-v10',
            center: [startLongitude, startLatitude],
            zoom: 12,
            accessToken: config.MAPBOX_API_KEY,
        })

        const geolocateContainer = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
        })

        mapContainer.addControl(geolocateContainer)
        mapContainer.on('load', () => {
            geolocateContainer.trigger()
            setGeolocationControl(geolocateContainer)
            setIsGeolocating(true)
        })
        mapContainer.on('click', () => {
            console.log('map container clicked')
        })
        geolocateContainer.on('geolocate', (e: any) => {
            const latitude = e.coords.latitude
            const longitude = e.coords.longitude

            if (latitude && longitude) {
                setIsFetching(true)
                setIsGeolocating(false)
                setUserLatitudeAfterGeolocated(latitude)
                setUserLongitudeAfterGeolocated(longitude)
            }
        })

        // Add marker to maps
        const el = document.createElement('div')
        el.className = 'marker'
        new mapboxgl.Marker(el)
            .setLngLat([
                userLongitudeAfterGeolocated ?? 0,
                userLatitudeAfterGeolocated ?? 0,
            ])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                )
            )
            .addTo(mapContainer)
    }

    useEffect(() => {
        buildTheMap()
    }, [])

    useEffect(() => {
        buildTheMap()
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
            })
        }
    }, [isGeolocating])

    return (
        <>
            <SearchBox />
            <div
                className="w-full"
                style={{ height: mapHeight }}
                ref={(el) => (mapWrapper.current = el)}
            ></div>
        </>
    )
}

export default MapsV2
