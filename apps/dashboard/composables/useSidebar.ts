export function useSidebar() {
  const collapsed = useState("sidebar-collapsed", () => false);
  function toggle() { collapsed.value = !collapsed.value; }
  return { collapsed, toggle };
}
