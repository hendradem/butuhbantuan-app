export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie("dashboard-token");
  if (!token.value && to.path !== "/login") {
    return navigateTo("/login");
  }
  if (token.value && to.path === "/login") {
    return navigateTo("/");
  }
});
