import { create } from 'zustand'

type State = {
    mapBoxContainer: any
    directionRoute: any
}

type Action = {
    updateMapBoxContainer: (mapBoxContainer: State['mapBoxContainer']) => void
    updateDirectionRoute: (directionRoute: State['directionRoute']) => void
}

const useMapBox = create<State & Action>()((set) => ({
    mapBoxContainer: {},
    directionRoute: [],
    updateMapBoxContainer: (mapBoxContainer) => {
        set(() => ({ mapBoxContainer: mapBoxContainer }))
    },
    updateDirectionRoute: (directionRoute) => {
        set(() => ({ directionRoute: directionRoute }))
    },
}))

export default useMapBox
