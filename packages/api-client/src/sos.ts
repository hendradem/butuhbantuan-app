import type { ApiResponse, SOSAlert, SOSSubmitPayload } from "@butuhbantuan/types";
import type { ApiClient } from "./client";

export function createSOSApi(client: ApiClient) {
  return {
    submit(payload: SOSSubmitPayload) {
      return client.post<ApiResponse<SOSAlert>>("/api/v1/sos", payload);
    },
    list() {
      return client.get<ApiResponse<SOSAlert[]>>("/api/v1/sos");
    },
  };
}
