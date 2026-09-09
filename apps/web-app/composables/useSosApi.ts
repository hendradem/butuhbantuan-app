export function useSosApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  async function submitSOS(payload: {
    name: string;
    phone: string;
    lat: number;
    lng: number;
    address: string;
    description: string;
    photo_url?: string;
    type_id?: number;
    regency_id?: string;
    province_id?: string;
  }) {
    const res = await $fetch<{ data: { ticket_number?: string; reused?: boolean } }>(
      `${baseUrl}/api/v1/sos/`,
      { method: "POST", body: payload }
    );
    return res.data;
  }

  return { submitSOS };
}
