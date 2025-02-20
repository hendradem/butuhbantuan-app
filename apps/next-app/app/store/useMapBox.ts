import { create } from 'zustand'

type State = {
    mapBoxContainer: any
}

type Action = {
    updateMapBoxContainer: (mapBoxContainer: State['mapBoxContainer']) => void
}

const useMapBox = create<State & Action>()((set) => ({
    mapBoxContainer: {},
    updateMapBoxContainer: (mapBoxContainer) => {
        set(() => ({ mapBoxContainer: mapBoxContainer }))
    },
}))

export default useMapBox
