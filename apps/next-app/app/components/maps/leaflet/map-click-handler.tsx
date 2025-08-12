import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

type MapClickHandlerProps = {
    onClick: (latlng: [number, number]) => void
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onClick }) => {
    const map = useMap()

    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            const latlng: [number, number] = [e.latlng.lat, e.latlng.lng]
            onClick(latlng)
        }

        map.on('click', handleClick)
        return () => {
            map.off('click', handleClick)
        }
    }, [map, onClick])

    return null
}

export default MapClickHandler
