'use client'

import React, { useEffect, useState } from 'react'
import useOnboardingStore from './store/useOnboarding'
import GetLocationPage from './components/onboarding/GetLocationPage'
import OnboardingPage from './components/onboarding/OnboardingPage'

export default function Home() {
    const isOnboarding = useOnboardingStore((state) => state.isOnboarding)
    const [shouldOnboarding, setShouldOnboarding] = useState<boolean | null>(
        null
    )

    useEffect(() => {
        if (typeof window === 'undefined') return // SSR guard

        const local = localStorage.getItem('onboarding')

        if (local === 'false') {
            setShouldOnboarding(false)
        } else if (isOnboarding === false) {
            localStorage.setItem('onboarding', 'false')
            setShouldOnboarding(false)
        } else {
            setShouldOnboarding(true)
        }
    }, [isOnboarding])

    if (shouldOnboarding === null) return null

    return (
        <div>{shouldOnboarding ? <OnboardingPage /> : <GetLocationPage />}</div>
    )
}
