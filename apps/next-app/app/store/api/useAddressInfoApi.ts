import useSWR from 'swr'
import config from '@/app/config'
import { fetcher } from '@/app/libs/fetcher'
import { useQuery } from '@tanstack/react-query'

const useAddressInfoApi = (longitude: number, latitude: number) => {
    const { data, error, isLoading } = useSWR(
        `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${config.MAPBOX_API_KEY}`,
        fetcher
    )

    return {
        addressData: data,
        addressError: error,
        isAddressLoading: isLoading,
    }
}

export default useAddressInfoApi
