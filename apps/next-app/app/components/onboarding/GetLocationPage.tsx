import React from 'react'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentLocation } from '@/utils/getCurrentLocation'
import { getAddressInfo } from '@/store/api/services/location.service'
import { availableCityService } from '@/store/api/services/availablecity.service'
import useAppError from '@/store/useAppError'
import GettingService from './partials/GettingService'
import ServiceLoading from './partials/ServiceLoading'
import ServiceError from './partials/ServiceError'
import useUserLocationData from '@/store/useUserLocationData'

const GetLocationPage = () => {
    const router = useRouter()
    const [error, setError] = useState('')
    const [isAvailable, setIsAvailable] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [currentRegionName, setCurrentRegionName] = useState('')
    const { setError: setErrorLocation } = useAppError()
    const { setCurrentRegion } = useUserLocationData()

    const getAvailableRegion = async (regionName: string) => {
        if (!regionName) return

        await availableCityService.getByName(regionName).then((res) => {
            if (res.data.length > 0) {
                const result = res.data[0]

                const regencyID = result.id
                const regencyName = result.name
                const provinceID = res.data[0].regency.Province.id
                const provinceName = res.data[0].regency.Province.name

                setCurrentRegion({
                    regency: { id: regencyID, name: regencyName },
                    province: { id: provinceID, name: provinceName },
                })

                setIsAvailable(true)
                setIsLoading(false)

                setCurrentRegionName(regionName)
                localStorage.setItem('userRegency', regionName)
                localStorage.setItem('userRegencyID', regencyID)

                toast.success('Layanan Tersedia', {
                    style: {
                        borderRadius: '20px',
                        background: '#333',
                        color: '#fff',
                    },
                })

                router.replace('/emergency')
            } else {
                setIsAvailable(false)
                setIsLoading(false)

                toast.error('Layanan Tidak Tersedia', {
                    style: {
                        borderRadius: '20px',
                        background: '#333',
                        color: '#fff',
                    },
                })
            }
        })
    }

    const fetchLocation = async () => {
        try {
            const location = await new Promise<{
                lat: number
                lng: number
                error?: string
            }>((resolve) => getCurrentLocation(resolve))

            if (location.error) {
                setError(location.error)
                setErrorLocation(location.error)
                setIsLoading(false)
            }

            const res = await getAddressInfo(location.lng, location.lat)
            const regionResult = res[3]?.text
            setCurrentRegionName(regionResult)

            await getAvailableRegion(regionResult)
        } catch (error) {
            console.error('Failed to fetch location/address info', error)
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLocation()
    }, [])

    if (isLoading) {
        return (
            <main className="w-full h-screen flex flex-col items-center justify-center bg-white">
                <ServiceLoading currentUserRegency={currentRegionName} />
            </main>
        )
    } else {
        return (
            <div className="w-full h-screen px-10 text-center bg-white flex items-center justify-center">
                {error == 'permission_denied' && <ServiceError error={error} />}
                {error == 'position_unavailable' && (
                    <ServiceError error={error} />
                )}

                {error == '' && (
                    <GettingService
                        currentUserRegency={currentRegionName}
                        isServiceIsAvailable={isAvailable}
                    />
                )}
            </div>
        )
    }
}

export default GetLocationPage
