export function useAuth() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;
  const token = useCookie<string | null>("dashboard-token", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  const isAuthenticated = computed(() => !!token.value);

  async function login(key: string): Promise<void> {
    const res = await $fetch<{ data: { token: string } }>(
      `${baseUrl}/api/v1/auth/login`,
      { method: "POST", body: { key } }
    );
    token.value = res.data.token;
  }

  function logout() {
    token.value = null;
    return navigateTo("/login");
  }

  return { token, isAuthenticated, login, logout };
}
