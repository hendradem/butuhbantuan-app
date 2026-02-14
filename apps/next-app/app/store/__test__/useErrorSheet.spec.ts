import useErrorSheet from '@/store/useErrorSheet'

describe('useErrorSheet store', () => {
    beforeEach(() => {
        useErrorSheet.setState({
            isOpen: false,
            errorMessage: '',
        })
    })

    it('should open the sheet', () => {
        useErrorSheet.getState().onOpen()
        expect(useErrorSheet.getState().isOpen).toBe(true)
    })

    it('should close the sheet', () => {
        useErrorSheet.setState({ isOpen: true }) // open first
        useErrorSheet.getState().onClose()
        expect(useErrorSheet.getState().isOpen).toBe(false)
    })

    it('should set the error message', () => {
        useErrorSheet.getState().setErrorMessage('Something went wrong')
        expect(useErrorSheet.getState().errorMessage).toBe(
            'Something went wrong'
        )
    })
})
