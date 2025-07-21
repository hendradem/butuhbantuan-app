import { create } from 'zustand'

type State = {
    mapBoxContainer: any
    directionRoute: any[]
    isRebuildMap: boolean
    userRegionCoordinate: { lat: number; long: number }
}

type Action = {
    updateMapBoxContainer: (mapBoxContainer: State['mapBoxContainer']) => void
    updateDirectionRoute: (directionRoute: State['directionRoute']) => void
    onRebuild: () => void
}

const useMapBox = create<State & Action>()((set) => ({
    mapBoxContainer: {},
    directionRoute: [],
    isRebuildMap: false,
    userRegionCoordinate: { lat: 0, long: 0 },
    updateMapBoxContainer: (mapBoxContainer) => {
        set(() => ({ mapBoxContainer: mapBoxContainer }))
    },
    updateDirectionRoute: (directionRoute) => {
        set(() => ({ directionRoute: directionRoute }))
    },
    updateUserRegionCoordinate: (userRegionCoordinate: {
        lat: number
        long: number
    }) => {
        set(() => ({ userRegionCoordinate: userRegionCoordinate }))
    },

    onRebuild: () => set(() => ({ isRebuildMap: true })),
}))

export default useMapBox
