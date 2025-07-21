import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { availableCityService } from './services/availablecity.service'

export const useAvailableCityApi = (cityName?: string) => {
    const [isAvailable, setIsAvailable] = useState(false)
    const [currentUserCityData, setCurrentUserCityData] = useState(null)
    const getAll = useQuery(['available-city'], availableCityService.getAll, {
        enabled: false,
    })

    useEffect(() => {
        if (getAll.data) {
            const foundCity = getAll.data.data.find(
                (city: any) => city.city_name === cityName
            )

            setCurrentUserCityData(foundCity)
            setIsAvailable(!!foundCity) // true if found, false otherwise
        }
    }, [getAll.data, cityName])

    return {
        availableCityData: getAll.data,
        currentCityData: currentUserCityData,
        isServiceIsAvailable: isAvailable,
        availableCityDataLoading: getAll.isLoading,
        refetchAvailableCity: getAll.refetch,
    }
}
