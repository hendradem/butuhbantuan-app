import { create } from 'zustand'

type State = {
    zoom: number
    routeStartPoint: { lat: number; lng: number }
    routeEndPoint: { lat: number; lng: number }
    mapBoxContainer: any
}

type Action = {
    updateMapBoxContainer: (mapBoxContainer: State['mapBoxContainer']) => void
    updateLeafletRouting: (routingData: any) => void
    resetLeafletRouting: () => void
    setMapZoom: (zoom: State['zoom']) => void
}

const useLeaflet = create<State & Action>()((set) => ({
    zoom: 15,
    mapBoxContainer: {},
    routeStartPoint: { lat: 0, lng: 0 },
    routeEndPoint: { lat: 0, lng: 0 },

    updateMapBoxContainer: (mapBoxContainer) => {
        set(() => ({ mapBoxContainer: mapBoxContainer }))
    },
    updateLeafletRouting: (routingData) => {
        set(() => ({
            routeStartPoint: {
                lat: routingData.startPoint.lat,
                lng: routingData.startPoint.lng,
            },
            routeEndPoint: {
                lat: routingData.routeEndPoint.lat,
                lng: routingData.routeEndPoint.lng,
            },
        }))
    },
    resetLeafletRouting: () => {
        set(() => ({
            routeStartPoint: { lat: 0, lng: 0 },
            routeEndPoint: { lat: 0, lng: 0 },
        }))
    },
    setMapZoom: (zoom) => {
        set(() => ({ zoom: zoom }))
    },
}))

export default useLeaflet
