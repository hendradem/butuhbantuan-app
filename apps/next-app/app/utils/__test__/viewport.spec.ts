import { setRealViewportHeight } from '../setViewportHeight'

describe('setRealViewportHeight', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 800,
        })
    })

    it('sets --vh CSS variable correctly', () => {
        setRealViewportHeight()

        const expectedVh = `${800 * 0.01}px`
        const actualVh = document.documentElement.style.getPropertyValue('--vh')
        expect(actualVh).toBe(expectedVh)
    })
})
