export function useUnitSidebar() {
  const collapsed = useState("unit-sidebar-collapsed", () => false);
  function toggle() {
    collapsed.value = !collapsed.value;
  }
  return { collapsed, toggle };
}
