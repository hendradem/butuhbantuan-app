export function useUnitAuth() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  const token = useCookie<string | null>("unit-token", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  const emergencyUUID = useCookie<string | null>("unit-uuid", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  const unitUsername = useCookie<string | null>("unit-username", {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  function unitHeaders(): Record<string, string> {
    return token.value ? { "X-Unit-Token": token.value } : {};
  }

  async function login(username: string, password: string) {
    const res = await $fetch<{ data: { access_token: string; emergency_uuid: string; username: string } }>(
      `${baseUrl}/api/v1/unit/auth/login`,
      { method: "POST", body: { username, password } }
    );
    token.value = res.data.access_token;
    emergencyUUID.value = res.data.emergency_uuid;
    unitUsername.value = res.data.username;
  }

  function logout() {
    token.value = null;
    emergencyUUID.value = null;
    unitUsername.value = null;
    return navigateTo("/login");
  }

  return { token, emergencyUUID, unitUsername, unitHeaders, login, logout };
}
