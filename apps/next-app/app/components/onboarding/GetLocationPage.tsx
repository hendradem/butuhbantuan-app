import React from 'react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAvailableCityApi } from '@/app/store/api/availablecity.api'
import { getCurrentLocation } from '@/app/utils/getCurrentLocation'
import { getAddressInfo } from '@/app/store/api/services/location.service'
import GettingService from './partials/GettingService'
import ServiceLoading from './partials/ServiceLoading'
import { redirect } from 'next/navigation'

const GetLocationPage = () => {
    const [currentUserRegency, setCurrentUserRegency] = useState('')
    const [isAvailable, setIsAvailable] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const { currentCityData, isServiceIsAvailable, refetchAvailableCity } =
        useAvailableCityApi(currentUserRegency)

    // Fetch user location and determine regency
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const location = await new Promise<{
                    lat: number
                    lng: number
                }>((resolve) => getCurrentLocation(resolve))

                const res = await getAddressInfo(location.lng, location.lat)
                const regency = res[3]?.text

                if (regency) {
                    setCurrentUserRegency(regency)
                    localStorage.setItem('userRegency', regency)
                } else {
                    setIsLoading(false)
                }
            } catch (error) {
                console.error('Failed to fetch location/address info', error)
                setIsLoading(false)
            }
        }

        fetchLocation()
    }, [])

    // When regency changes, trigger refetch
    useEffect(() => {
        if (!currentUserRegency) return
        refetchAvailableCity()
    }, [currentUserRegency])

    // When API data changes, determine availability
    useEffect(() => {
        if (!currentUserRegency) return

        const available = !!(currentCityData && isServiceIsAvailable)
        setIsAvailable(available)

        if (available) {
            toast.success('Service is available', {
                style: {
                    borderRadius: '20px',
                    background: '#333',
                    color: '#fff',
                },
            })

            redirect('/emergency')
        } else {
            toast.error('Service not found', {
                style: {
                    borderRadius: '20px',
                    background: '#333',
                    color: '#fff',
                },
            })
        }

        setTimeout(() => setIsLoading(false), 500)
    }, [currentCityData, isServiceIsAvailable])

    if (isLoading) {
        return (
            <main className="w-full h-screen flex flex-col items-center justify-center bg-white">
                <ServiceLoading currentUserRegency={currentUserRegency} />
            </main>
        )
    } else {
        return (
            <div className="w-full h-screen px-10 text-center bg-white flex items-center justify-center">
                <GettingService
                    currentUserRegency={currentUserRegency}
                    isServiceIsAvailable={isAvailable}
                />
            </div>
        )
    }
}

export default GetLocationPage
