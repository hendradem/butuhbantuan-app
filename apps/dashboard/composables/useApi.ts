export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;
  const { token } = useAuth();

  function adminHeaders(): Record<string, string> {
    return token.value ? { "X-Admin-Key": token.value } : {};
  }

  return {
    baseUrl,
    get<T>(path: string) {
      return $fetch<T>(`${baseUrl}${path}`);
    },
    post<T>(path: string, body: Record<string, unknown>) {
      return $fetch<T>(`${baseUrl}${path}`, {
        method: "POST",
        body,
        headers: adminHeaders(),
      });
    },
    put<T>(path: string, body: Record<string, unknown>) {
      return $fetch<T>(`${baseUrl}${path}`, {
        method: "PUT",
        body,
        headers: adminHeaders(),
      });
    },
    del<T>(path: string) {
      return $fetch<T>(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
    },
  };
}
