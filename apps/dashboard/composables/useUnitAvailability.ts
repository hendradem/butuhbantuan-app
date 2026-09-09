// Shared availability toggle state for unit dashboard.
// Used in both the layout sidebar and the orders page.
export function useUnitAvailability() {
  const { unitHeaders } = useUnitAuth();
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  const isActive = useState<boolean>('unit-is-active', () => true);
  const toggling = ref(false);

  function initFromProfile(operational: any) {
    if (operational != null) isActive.value = operational.is_active !== false;
  }

  async function toggle() {
    toggling.value = true;
    try {
      await $fetch(`${baseUrl}/api/v1/unit/availability`, {
        method: 'PATCH',
        headers: { ...unitHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive.value }),
      });
      isActive.value = !isActive.value;
    } finally {
      toggling.value = false;
    }
  }

  return { isActive, toggling, toggle, initFromProfile };
}
