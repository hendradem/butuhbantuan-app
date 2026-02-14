import useExploreSheet from '@/store/useExploreSheet'

describe('useExploreSheet store', () => {
    beforeEach(() => {
        useExploreSheet.setState({
            isOpen: false,
            isFullScreen: false,
            sheetData: null,
            snapPoint: 1,
        })
    })

    it('should open the sheet', () => {
        useExploreSheet.getState().onOpen()
        expect(useExploreSheet.getState().isOpen).toBe(true)
    })

    it('should close the sheet', () => {
        useExploreSheet.setState({ isOpen: true })
        useExploreSheet.getState().onClose()
        expect(useExploreSheet.getState().isOpen).toBe(false)
    })

    it('should enter full screen mode', () => {
        useExploreSheet.getState().onFullScreen()
        expect(useExploreSheet.getState().isFullScreen).toBe(true)
    })

    it('should exit full screen mode', () => {
        useExploreSheet.setState({ isFullScreen: true })
        useExploreSheet.getState().onExitFullScreen()
        expect(useExploreSheet.getState().isFullScreen).toBe(false)
    })

    it('should set sheet data', () => {
        const mockData = {
            emergencyType: { id: 1, name: 'Ambulance' },
            emergency: { id: 2, name: 'RSUD Bandung' },
        }

        useExploreSheet.getState().setSheetData(mockData)
        expect(useExploreSheet.getState().sheetData).toEqual(mockData)
    })

    it('should update snapPoint', () => {
        useExploreSheet.getState().onSnap(3)
        expect(useExploreSheet.getState().snapPoint).toBe(3)
    })
})
