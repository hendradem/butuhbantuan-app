import useConfirmationSheet from '@/store/useConfirmationSheet'

describe('useConfirmationSheet store', () => {
    beforeEach(() => {
        useConfirmationSheet.setState({
            isOpen: false,
            callType: 'default',
            callNumber: '',
        })
    })

    it('should open the sheet', () => {
        useConfirmationSheet.getState().onOpen()
        expect(useConfirmationSheet.getState().isOpen).toBe(true)
    })

    it('should close the sheet', () => {
        useConfirmationSheet.setState({ isOpen: true })
        useConfirmationSheet.getState().onClose()
        expect(useConfirmationSheet.getState().isOpen).toBe(false)
    })

    it('should set call type to whatsapp', () => {
        useConfirmationSheet.getState().setCallType('whatsapp')
        expect(useConfirmationSheet.getState().callType).toBe('whatsapp')
    })

    it('should set call type to phone', () => {
        useConfirmationSheet.getState().setCallType('phone')
        expect(useConfirmationSheet.getState().callType).toBe('phone')
    })

    it('should set call number', () => {
        useConfirmationSheet.getState().setCallNumber('08123456789')
        expect(useConfirmationSheet.getState().callNumber).toBe('08123456789')
    })
})
