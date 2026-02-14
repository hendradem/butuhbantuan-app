import useSearchSheet from '@/store/useSearchSeet'

describe('useSearchSheet store', () => {
    beforeEach(() => {
        useSearchSheet.setState({
            isOpen: false,
            snapPoint: 1,
        })
    })

    it('should have initial state', () => {
        const state = useSearchSheet.getState()
        expect(state.isOpen).toBe(false)
        expect(state.snapPoint).toBe(1)
    })

    it('should open the search sheet', () => {
        useSearchSheet.getState().onOpen()
        expect(useSearchSheet.getState().isOpen).toBe(true)
    })

    it('should close the search sheet', () => {
        useSearchSheet.setState({ isOpen: true })
        useSearchSheet.getState().onClose()
        expect(useSearchSheet.getState().isOpen).toBe(false)
    })

    it('should update snap point', () => {
        useSearchSheet.getState().onSnap(2)
        expect(useSearchSheet.getState().snapPoint).toBe(2)
    })
})
