import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

interface MapViewHandlerProps {
    latlng: [number, number]
    zoom: number
}

const MapViewHandler: React.FC<MapViewHandlerProps> = ({
    latlng,
    zoom = 15,
}: any) => {
    const map = useMap()

    useEffect(() => {
        if (latlng) {
            map.setView(latlng, zoom)
        }
    }, [latlng, zoom])

    return null
}

export default MapViewHandler
