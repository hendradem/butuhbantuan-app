import useCoreSheet from '@/store/useCoreSheet'

describe('useCoreSheet store', () => {
    beforeEach(() => {
        useCoreSheet.setState({ isOpen: false })
    })

    it('should open the core sheet', () => {
        useCoreSheet.getState().onOpen()
        expect(useCoreSheet.getState().isOpen).toBe(true)
    })

    it('should close the core sheet', () => {
        useCoreSheet.setState({ isOpen: true })
        useCoreSheet.getState().onClose()
        expect(useCoreSheet.getState().isOpen).toBe(false)
    })
})
