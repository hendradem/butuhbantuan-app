import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import useLeaflet from '@/store/useLeaflet'

interface MapViewHandlerProps {
    latlng: [number, number]
}

const MapViewHandler: React.FC<MapViewHandlerProps> = ({ latlng }: any) => {
    const map = useMap()
    const mapZoom = useLeaflet((state) => state.zoom)

    useEffect(() => {
        if (latlng) {
            map.setView(latlng, mapZoom)
        }
    }, [latlng, mapZoom])

    return null
}

export default MapViewHandler
