import React, { useEffect, useRef } from 'react'
import useUserLocationData from '@/app/store/useUserLocationData'
import useUserLocation from '@/app/hooks/useUserLocation'
import useCalculateDuration from '@/app/hooks/useCalculateDuration'
import config from '@/app/config'
import mapboxgl from 'mapbox-gl'
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions'
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css'
import 'mapbox-gl/dist/mapbox-gl.css'

type DetailMapsProps = {
    coordinates: {
        startLat: number
        startLong: number
        endLat: number
        endLong: number
    }
}

const DetailMaps: React.FC<DetailMapsProps> = ({ coordinates }) => {
    const mapWrapper = useRef<any>(null)
    const { currentUserLocation, setUserLocation } = useUserLocation()
    const calculateDuration = useCalculateDuration
    const startLatitude = -7.7063721
    const startLongitude = 110.3450278

    const getAddress = async (latitude: number, longitude: number) => {
        const start = [-7.7063721, 110.3450278]
        const end = [-7.76115, 110.3734911]

        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start[1]},${start[0]};${end[1]},${end[0]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
            { method: 'GET' }
        )

        const json = await query.json()
        const data = json.routes[0]
        const route = data.geometry.coordinates
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route,
            },
        }
    }

    const buildTheMap = async () => {
        const map = new mapboxgl.Map({
            container: mapWrapper.current,
            style: 'mapbox://styles/mapbox/streets-v10',
            center: [startLongitude, startLatitude],
            zoom: 12,
            accessToken: config.MAPBOX_API_KEY,
        })

        const directions = new MapboxDirections({
            accessToken: config.MAPBOX_API_KEY,
            unit: 'metric',
            profile: 'mapbox/driving',
        })

        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.startLong},${coordinates.startLat};${coordinates.endLong},${coordinates.endLat}?geometries=geojson&access_token=${config.MAPBOX_API_KEY}`,
            { method: 'GET' }
        )

        const json = await query.json()
        const data = json.routes[0]
        const route = data.geometry.coordinates
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route,
            },
        }

        if (geojson) {
            map.addLayer({
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
                    'line-color': '#3887be',
                    'line-width': 5,
                    'circle-radius': 10,
                    'circle-color': '#f30',
                },
            })
        }
    }

    useEffect(() => {
        buildTheMap()
    }, [])

    return (
        <>
            <div
                className="w-full h-[300px] bg-orange-100"
                ref={(el) => (mapWrapper.current = el)}
            />
        </>
    )
}

export default DetailMaps
