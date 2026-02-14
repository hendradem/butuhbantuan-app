import useMainBottomSheet from '@/store/useMainBottomSheet'

describe('useMainBottomSheet store', () => {
    beforeEach(() => {
        useMainBottomSheet.setState({
            isOpen: true,
            isFullScreen: false,
            isMainBottomDetailSheetOpen: false,
        })
    })

    it('should open the sheet', () => {
        useMainBottomSheet.setState({ isOpen: false })
        useMainBottomSheet.getState().onOpen()
        expect(useMainBottomSheet.getState().isOpen).toBe(true)
    })

    it('should close the sheet', () => {
        useMainBottomSheet.setState({ isOpen: true })
        useMainBottomSheet.getState().onClose()
        expect(useMainBottomSheet.getState().isOpen).toBe(false)
    })

    it('should enable full screen', () => {
        useMainBottomSheet.setState({ isFullScreen: false })
        useMainBottomSheet.getState().onFullScreen()
        expect(useMainBottomSheet.getState().isFullScreen).toBe(true)
    })

    it('should exit full screen', () => {
        useMainBottomSheet.setState({ isFullScreen: true })
        useMainBottomSheet.getState().onExitFullScreen()
        expect(useMainBottomSheet.getState().isFullScreen).toBe(false)
    })

    it('should set main bottom detail sheet open to true', () => {
        useMainBottomSheet.getState().setMainBottomDetailSheetOpen(true)
        expect(useMainBottomSheet.getState().isMainBottomDetailSheetOpen).toBe(
            true
        )
    })

    it('should set main bottom detail sheet open to false', () => {
        useMainBottomSheet.getState().setMainBottomDetailSheetOpen(false)
        expect(useMainBottomSheet.getState().isMainBottomDetailSheetOpen).toBe(
            false
        )
    })
})
