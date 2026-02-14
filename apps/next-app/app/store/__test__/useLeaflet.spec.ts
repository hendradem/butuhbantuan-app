import useLeaflet from '@/store/useLeaflet'

describe('useLeaflet store', () => {
    beforeEach(() => {
        useLeaflet.setState({
            zoom: 13,
            fitBounds: null,
            mapBoxContainer: {},
            routeStartPoint: { lat: 0, lng: 0 },
            routeEndPoint: { lat: 0, lng: 0 },
        })
    })

    it('should update mapBoxContainer', () => {
        const dummyContainer = { id: 'mapbox-container' }
        useLeaflet.getState().updateMapBoxContainer(dummyContainer)
        expect(useLeaflet.getState().mapBoxContainer).toEqual(dummyContainer)
    })

    it('should update leaflet routing', () => {
        const routingData = {
            startPoint: { lat: -6.2, lng: 106.8 },
            routeEndPoint: { lat: -6.3, lng: 107.0 },
        }
        useLeaflet.getState().updateLeafletRouting(routingData)

        const state = useLeaflet.getState()
        expect(state.routeStartPoint).toEqual({ lat: -6.2, lng: 106.8 })
        expect(state.routeEndPoint).toEqual({ lat: -6.3, lng: 107.0 })
    })

    it('should reset leaflet routing', () => {
        useLeaflet.setState({
            routeStartPoint: { lat: -1, lng: -1 },
            routeEndPoint: { lat: 1, lng: 1 },
        })

        useLeaflet.getState().resetLeafletRouting()
        const state = useLeaflet.getState()
        expect(state.routeStartPoint).toEqual({ lat: 0, lng: 0 })
        expect(state.routeEndPoint).toEqual({ lat: 0, lng: 0 })
    })

    it('should set map zoom', () => {
        useLeaflet.getState().setMapZoom(17)
        expect(useLeaflet.getState().zoom).toBe(17)
    })

    it('should set fitBounds', () => {
        const bounds = [
            [-6.2, 106.8],
            [-6.3, 107.0],
        ] as L.LatLngBoundsExpression

        useLeaflet.getState().setFitBounds(bounds)
        expect(useLeaflet.getState().fitBounds).toEqual(bounds)
    })

    it('should reset fitBounds', () => {
        useLeaflet.setState({
            fitBounds: [
                [-6.1, 106.7],
                [-6.4, 107.2],
            ],
        })
        useLeaflet.getState().resetFitBounds()
        expect(useLeaflet.getState().fitBounds).toBeNull()
    })
})
