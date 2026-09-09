export const useOnboardingStore = defineStore("onboarding", {
  state: () => ({ isOnboarding: true }),
  actions: {
    setIsOnboarding(status: boolean) {
      this.isOnboarding = status;
    },
  },
});
