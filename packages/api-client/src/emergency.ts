import type { ApiResponse, Emergency, PaginatedResponse } from "@butuhbantuan/types";
import type { ApiClient } from "./client";

export function createEmergencyApi(client: ApiClient) {
  return {
    list(params?: { page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      return client.get<PaginatedResponse<Emergency>>(
        `/api/v1/emergencies?${query}`
      );
    },

    get(id: string) {
      return client.get<ApiResponse<Emergency>>(`/api/v1/emergencies/${id}`);
    },

    create(payload: Omit<Emergency, "id" | "createdAt" | "updatedAt">) {
      return client.post<ApiResponse<Emergency>>("/api/v1/emergencies", payload);
    },

    update(id: string, payload: Partial<Emergency>) {
      return client.put<ApiResponse<Emergency>>(
        `/api/v1/emergencies/${id}`,
        payload
      );
    },
  };
}
