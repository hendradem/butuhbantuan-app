import useAppError from '@/store/useAppError'

describe('useAppError store', () => {
    beforeEach(() => {
        useAppError.setState({ error: null, isSheetOpen: false }) // reset state sebelum tiap test
    })

    it('should open the sheet', () => {
        useAppError.getState().onOpenSheet()
        expect(useAppError.getState().isSheetOpen).toBe(true)
    })

    it('should close the sheet', () => {
        useAppError.setState({ isSheetOpen: true })
        useAppError.getState().onCloseSheet()
        expect(useAppError.getState().isSheetOpen).toBe(false)
    })

    it('should set error message', () => {
        useAppError.getState().setError('Something went wrong')
        expect(useAppError.getState().error).toBe('Something went wrong')
    })

    it('should clear error message', () => {
        useAppError.setState({ error: 'Old error' })
        useAppError.getState().clearError()
        expect(useAppError.getState().error).toBeNull()
    })
})
