export default defineNuxtRouteMiddleware((to) => {
  const adminToken = useCookie("dashboard-token");
  const unitToken = useCookie("unit-token");

  const isAdmin = !!adminToken.value;
  const isUnit = !!unitToken.value;

  // Login page logic
  if (to.path === "/login") {
    if (isAdmin) return navigateTo("/");
    if (isUnit) return navigateTo("/unit/orders");
    return;
  }

  // Unit routes: only unit users
  if (to.path.startsWith("/unit/")) {
    if (isUnit) return;
    if (isAdmin) return navigateTo("/");
    return navigateTo("/login");
  }

  // Admin routes: only admin users
  if (!isAdmin) {
    if (isUnit) return navigateTo("/unit/orders");
    return navigateTo("/login");
  }
});
