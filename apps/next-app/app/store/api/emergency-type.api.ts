import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emergencyTypeService } from "./services/emergency-type.service";

export const useEmergencyTypeApi = () => {
  const queryClient = useQueryClient();

  const getAll = useQuery(["emergency-type"], emergencyTypeService.getAll);

  const create = useMutation(emergencyTypeService.create, {
    onSuccess: () => queryClient.invalidateQueries(["emergency-type"]),
  });

  const update = useMutation(
    ({ id, data }: { id: string; data: any }) =>
      emergencyTypeService.update(id, data),
    {
      onSuccess: () => queryClient.invalidateQueries(["emergency-type"]),
    }
  );

  const remove = useMutation((id: string) => emergencyTypeService.delete(id), {
    onSuccess: () => queryClient.invalidateQueries(["emergency-type"]),
  });

  return {
    emergencyTypeData: getAll.data,
    emergencyTypeLoading: getAll.isLoading,
    refetchEmergencyType: getAll.refetch,
    createEmergencyType: create,
    updateEmergencyType: update,
    deleteEmergencyType: remove,
  };
};
