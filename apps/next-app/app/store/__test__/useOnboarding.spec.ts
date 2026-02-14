import useOnboardingStore from '@/store/useOnboarding'

describe('useOnboardingStore', () => {
    beforeEach(() => {
        useOnboardingStore.setState({ isOnboarding: true })
    })

    it('should have initial state as true', () => {
        expect(useOnboardingStore.getState().isOnboarding).toBe(true)
    })

    it('should update isOnboarding to false', () => {
        useOnboardingStore.getState().setIsOnboarding(false)
        expect(useOnboardingStore.getState().isOnboarding).toBe(false)
    })

    it('should update isOnboarding to true again', () => {
        useOnboardingStore.setState({ isOnboarding: false })
        useOnboardingStore.getState().setIsOnboarding(true)
        expect(useOnboardingStore.getState().isOnboarding).toBe(true)
    })
})
