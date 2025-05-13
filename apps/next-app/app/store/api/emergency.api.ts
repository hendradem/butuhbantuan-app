import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emergencyService } from "./services/emergency.service";
import updateEmergencyData from "../useEmergencyData";
import { EmergencyDataType } from "@/app/types/emergency";

export const useEmergencyApi = () => {
  const queryClient = useQueryClient();

  const getAll = useQuery(["emergency"], emergencyService.getAll, {
    onSuccess: (data) => {},
  });
  const create = useMutation(emergencyService.create, {
    onSuccess: () => queryClient.invalidateQueries(["emergency"]),
  });
  const update = useMutation(
    ({ id, data }: { id: string; data: any }) =>
      emergencyService.update(id, data),
    {
      onSuccess: () => queryClient.invalidateQueries(["emergency"]),
    }
  );
  const remove = useMutation((id: string) => emergencyService.delete(id), {
    onSuccess: () => queryClient.invalidateQueries(["emergency"]),
  });

  return {
    emergencyData: getAll.data,
    emergencyDataLoading: getAll.isLoading,
    refetchEmergencyData: getAll.refetch,
    createEmergencyData: create,
    updateEmergencyData: update,
    deleteEmergencyData: remove,
  };
};
