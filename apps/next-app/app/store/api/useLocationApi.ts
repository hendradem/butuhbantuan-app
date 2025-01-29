import useSWR from 'swr'
import config from '@/app/config'
import { fetcher } from '@/app/libs/fetcher'

const useLocationApi = (locationQuery: string, shouldFetch: boolean) => {
    const { data, error, isLoading } = useSWR(
        shouldFetch
            ? `${config.GEOLOCATION_BASE_URL}/autocomplete?text=${locationQuery}&apiKey=${config.GEOAPIFY_API_KEY}`
            : null,
        fetcher
    )

    return {
        locationData: data,
        locationError: error,
        isLocationLoading: isLoading,
    }
}

export default useLocationApi
