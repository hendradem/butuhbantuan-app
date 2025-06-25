import { create } from 'zustand'

type State = {
    mapBoxContainer: any
    directionRoute: any[]
    isRebuildMap: boolean
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
    updateMapBoxContainer: (mapBoxContainer) => {
        set(() => ({ mapBoxContainer: mapBoxContainer }))
    },
    updateDirectionRoute: (directionRoute) => {
        set(() => ({ directionRoute: directionRoute }))
    },
    onRebuild: () => set(() => ({ isRebuildMap: true })),
}))

export default useMapBox
