import useDetailSheet from '@/store/useDetailSheet'

describe('useDetailSheet store', () => {
    beforeEach(() => {
        useDetailSheet.setState({
            isOpen: false,
            isFullScreen: false,
            detailSheetData: null,
        })
    })

    it('should open the detail sheet', () => {
        useDetailSheet.getState().onOpen()
        expect(useDetailSheet.getState().isOpen).toBe(true)
    })

    it('should close the detail sheet', () => {
        useDetailSheet.setState({ isOpen: true })
        useDetailSheet.getState().onClose()
        expect(useDetailSheet.getState().isOpen).toBe(false)
    })

    it('should enter full screen mode', () => {
        useDetailSheet.getState().onFullScreen()
        expect(useDetailSheet.getState().isFullScreen).toBe(true)
    })

    it('should exit full screen mode', () => {
        useDetailSheet.setState({ isFullScreen: true })
        useDetailSheet.getState().onExitFullScreen()
        expect(useDetailSheet.getState().isFullScreen).toBe(false)
    })

    it('should set detail sheet data', () => {
        const mockData = {
            emergencyType: { id: 1, name: 'Fire' },
            emergency: { id: 101, name: 'Fire Dept' },
        }

        useDetailSheet.getState().setDetailSheetData(mockData)
        expect(useDetailSheet.getState().detailSheetData).toEqual(mockData)
    })
})
