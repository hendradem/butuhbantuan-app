import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emergencyService } from './services/emergency.service'
import { toast } from 'react-hot-toast'

export const useEmergencyApi = () => {
    const queryClient = useQueryClient()

    const getAll = useQuery(['emergency'], emergencyService.getAll, {
        onSuccess: (data) => {},
    })

    // const getAllbyRegion = useQuery(
    //     ['emergency', regencyID],
    //     () => emergencyService.getAllbyRegional(regencyID),
    //     {
    //         enabled: !!regencyID,
    //         onSuccess: (data) => {},
    //         onError: () => toast.error('Gagal mengambil data emergency'),
    //     }
    // )

    const update = useMutation(
        ({ id, data }: { id: string; data: any }) =>
            emergencyService.update(id, data),
        {
            // onMutate: () => toastService.showLoading('Mengupdate data...'),
            onSuccess: () => {},
            onError: () => {},
        }
    )

    return {
        getEmergencyData: getAll.data,
        emergencyDataLoading: getAll.isLoading,
        refetchEmergencyData: getAll.refetch,
        // refetchEmergencybyRegion: getAllbyRegion.refetch,
        updateEmergencyData: update,
        // getEmergencybyRegion: getAllbyRegion.data,
    }
}
