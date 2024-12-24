import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import config from '@/app/config'

import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

type MapsProps = {
    mapRounded: number
    mapHeight: string
    position: object
}

const MapsV2: React.FC<MapsProps> = ({ mapRounded, mapHeight, position }) => {
    const mapContainerRef = useRef<any>()
    const mapRef = useRef<any>()

    useEffect(() => {
        mapboxgl.accessToken =
            'pk.eyJ1IjoiaGVuZHJhYWRlbSIsImEiOiJjbHE4NzdxMnkwbjdqMm1xcTVzanowNWRnIn0.8pRRX4WuAsiPJ3lRnROXRQ'

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-79.4512, 43.6568],
            // center: [position?.lat, position?.long],
            zoom: 13,
        })

        let geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
        })

        mapRef.current.addControl(geolocate)
        mapRef.current.on('load', function () {
            geolocate.trigger()
        })

        geolocate.on('geolocate', function (e) {
            // console.log(e)
            console.log('geolocated')
        })

        // Initialize the GeolocateControl.
        // const geolocate = new mapboxgl.GeolocateControl({
        //     positionOptions: {
        //         enableHighAccuracy: true
        //     },
        //     trackUserLocation: true
        // });

        // mapRef.current.addControl(geolocate);

        mapRef.current.addControl(
            new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
            })
        )

        // mapRef.current.on('load', () => {
        //     console.log('loaded')
        // })

        return () => mapRef.current.remove()
    }, [])

    return (
        <div
            ref={mapContainerRef}
            style={{
                width: '100%',
                borderRadius: mapRounded,
                height: mapHeight,
            }}
        />
    )
}

export default MapsV2
