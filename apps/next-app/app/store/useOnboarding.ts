import { create } from 'zustand'

interface OnboardingStore {
    isOnboarding: boolean
    setIsOnboarding: (status: boolean) => void
}

const useOnboardingStore = create<OnboardingStore>((set) => ({
    isOnboarding: true,
    setIsOnboarding: (status: boolean) => set({ isOnboarding: status }),
}))

export default useOnboardingStore
