import { create } from 'zustand'

type State = {
    fitBounds: L.LatLngBoundsExpression | null
    mapBoxContainer: any
    zoom: number
    routeStartPoint: { lat: number; lng: number }
    routeEndPoint: { lat: number; lng: number }
}

type Action = {
    updateMapBoxContainer: (mapBoxContainer: State['mapBoxContainer']) => void
    updateLeafletRouting: (routingData: any) => void
    resetLeafletRouting: () => void
    setMapZoom: (zoom: State['zoom']) => void
    setFitBounds: (bounds: State['fitBounds']) => void
    resetFitBounds: () => void
}

const useLeaflet = create<State & Action>()((set) => ({
    zoom: 13,
    fitBounds: null,
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
    setFitBounds: (bounds: L.LatLngBoundsExpression | null) =>
        set({ fitBounds: bounds }),
    resetFitBounds: () => set({ fitBounds: null }),
}))

export default useLeaflet
