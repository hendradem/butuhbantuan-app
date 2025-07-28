import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import Leaflet from 'leaflet'
import 'leaflet-routing-machine'
import toast from 'react-hot-toast'
import useLeaflet from '@/store/useLeaflet'

const RoutingMachine = () => {
    const map = useMap()

    const routeStartPoint = useLeaflet((state) => state.routeStartPoint)
    const routeEndPoint = useLeaflet((state) => state.routeEndPoint)
    const setMapZoom = useLeaflet((state) => state.setMapZoom)

    useEffect(() => {
        if (!map || !routeStartPoint.lat || !routeEndPoint.lat) return

        const toastId = toast.loading('Getting route')

        const routingControl = (Leaflet as any).Routing.control({
            waypoints: [
                Leaflet.latLng(routeStartPoint.lat, routeStartPoint.lng),
                Leaflet.latLng(routeEndPoint.lat, routeEndPoint.lng),
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
            createMarker: () => null,
            lineOptions: {
                styles: [
                    {
                        color: '#3b82f6',
                        opacity: 0.8,
                        weight: 6,
                    },
                ],
            },
            instructions: false,
        }).addTo(map)

        routingControl.on('routesfound', function (e: any) {
            const route = e.routes[0]
            const coords = route.coordinates // Array of LatLng

            if (coords && coords.length > 0) {
                const bounds = Leaflet.latLngBounds(coords)
                map.fitBounds(bounds, {
                    padding: [100, 100],
                    maxZoom: 15,
                    animate: true,
                })
            }

            toast.success('Route found', { id: toastId })
        })

        routingControl.on('routingerror', () => {
            toast.error('Failed to find route.', { id: toastId })
        })

        return () => {
            map.removeControl(routingControl)
            toast.dismiss(toastId)
        }
    }, [map, routeStartPoint, routeEndPoint])

    return null
}

export default RoutingMachine
