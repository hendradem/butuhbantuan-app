'use client'
import React from 'react'
import GetLocationPage from './components/onboarding/GetLocationPage'
import OnboardingPage from './components/onboarding/OnboardingPage'

export default function Home() {
    const shouldShowOnboarding =
        localStorage.getItem('onboarding') == null ? true : false
    return (
        <div>
            {shouldShowOnboarding ? (
                <OnboardingPage />
            ) : (
                <div>
                    <GetLocationPage />
                </div>
            )}
        </div>
    )
}
