'use client'
import React, { useEffect, useState } from 'react'
import useOnboardingStore from './store/useOnboarding'
import UserOnboarding from './components/onboarding/UserOnboarding'
import Emergency from './components/emergency/Emergency'

export default function Home() {
    const isOnboarding = useOnboardingStore((state) => state.isOnboarding)
    const [shouldOnboarding, setShouldOnboarding] = useState<boolean | null>(
        null
    )

    useEffect(() => {
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
        <div className="w-full bg-white">
            {shouldOnboarding ? <UserOnboarding /> : <Emergency />}
        </div>
    )
}
