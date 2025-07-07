import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emergencyService } from './services/emergency.service'
import { toastService } from '@/libs/toast'

export const useEmergencyApi = () => {
    const queryClient = useQueryClient()

    const getAll = useQuery(['emergency'], emergencyService.getAll, {
        onSuccess: (data) => {},
        // onError: () => toastService.error('Gagal mengambil data emergency'),
    })

    // if (getAll.isLoading) {
    //     toastService.showLoading('Mencarikan data untukmu')
    // }

    const create = useMutation(emergencyService.create, {
        // onMutate: () => toastService.showLoading('Menyimpan data...'),
        onSuccess: () => {
            queryClient.invalidateQueries(['emergency'])
        },
        onError: () => {},
    })

    const update = useMutation(
        ({ id, data }: { id: string; data: any }) =>
            emergencyService.update(id, data),
        {
            // onMutate: () => toastService.showLoading('Mengupdate data...'),
            onSuccess: () => {},
            onError: () => {},
        }
    )

    const remove = useMutation((id: string) => emergencyService.delete(id), {
        // onMutate: () => toastService.showLoading('Menghapus data...'),
        onSuccess: () => {},
        onError: () => {},
    })

    return {
        getEmergencyData: getAll.data,
        emergencyDataLoading: getAll.isLoading,
        refetchEmergencyData: getAll.refetch,
        createEmergencyData: create,
        updateEmergencyData: update,
        deleteEmergencyData: remove,
    }
}
