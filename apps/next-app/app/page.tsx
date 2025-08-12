<<<<<<< HEAD
"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAvailableCityApi } from "@/app/store/api/availablecity.api";
import { getCurrentLocation } from "./utils/getCurrentLocation";
import { getAddressInfo } from "./store/api/services/location.service";
import GettingService from "./components/onboarding/GettingService";
import ServiceLoading from "./components/onboarding/ServiceLoading";
=======
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
>>>>>>> 6b922f49fc712b0ac112b37d3528c7afe5dd39e0

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
<<<<<<< HEAD
      <main className="w-full h-screen flex flex-col items-center justify-center bg-white">
        <ServiceLoading currentUserRegency={currentUserRegency} />
      </main>
    );
  } else {
    return (
      <div className="w-full h-screen px-10 text-center bg-white flex items-center justify-center">
        <GettingService
          currentUserRegency={currentUserRegency}
          isServiceIsAvailable={isAvailable}
        />
      </div>
    );
  }
=======
        <div className="w-full bg-white">
            {shouldOnboarding ? <UserOnboarding /> : <Emergency />}
        </div>
    )
>>>>>>> 6b922f49fc712b0ac112b37d3528c7afe5dd39e0
}
