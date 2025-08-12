// utils/__test__/debounce.spec.ts
import { debounce } from '../debounce'

jest.useFakeTimers()

describe('debounce', () => {
    let mockFn: jest.Mock
    let debouncedFn: (...args: any[]) => void

    beforeEach(() => {
        mockFn = jest.fn()
        debouncedFn = debounce(mockFn, 500)
    })

    afterEach(() => {
        jest.clearAllTimers()
        jest.clearAllMocks()
    })

    it('should not call function immediately', () => {
        debouncedFn()
        expect(mockFn).not.toHaveBeenCalled()
    })

    it('should call function after delay', () => {
        debouncedFn('hello')
        jest.advanceTimersByTime(500)
        expect(mockFn).toHaveBeenCalledWith('hello')
        expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should debounce multiple calls within delay', () => {
        debouncedFn('first')
        jest.advanceTimersByTime(300)
        debouncedFn('second')
        jest.advanceTimersByTime(300)
        debouncedFn('third')
        jest.advanceTimersByTime(500)
        expect(mockFn).toHaveBeenCalledTimes(1)
        expect(mockFn).toHaveBeenCalledWith('third')
    })

    it('should reset timer on every call', () => {
        debouncedFn()
        jest.advanceTimersByTime(300)
        debouncedFn()
        jest.advanceTimersByTime(300)
        debouncedFn()
        jest.advanceTimersByTime(500)
        expect(mockFn).toHaveBeenCalledTimes(1)
    })
})
