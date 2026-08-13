/**
 * Persist a single active tab across detail navigation.
 * Source of truth while on the page: the ref. URL + sessionStorage are mirrors.
 */
export function usePersistedTab<T extends string>(
  storageKey: string,
  defaultValue: T,
  allowed: readonly T[],
  queryKey = "tab",
) {
  const route = useRoute();
  const router = useRouter();

  let syncingFromRoute = false;

  function parse(raw: unknown): T | null {
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
      return v as T;
    }
    return null;
  }

  function readStorage(): T | null {
    if (!import.meta.client) return null;
    try {
      return parse(sessionStorage.getItem(storageKey));
    } catch {
      return null;
    }
  }

  function writeStorage(value: T) {
    if (!import.meta.client) return;
    try {
      sessionStorage.setItem(storageKey, value);
    } catch {
      /* ignore */
    }
  }

  function queryValue(): T | null {
    return parse(route.query[queryKey]);
  }

  const initial = queryValue() ?? readStorage() ?? defaultValue;
  const tab = ref<T>(initial) as Ref<T>;

  function applyQuery(value: T) {
    const current = queryValue() ?? defaultValue;
    if (current === value) return;

    const nextQuery: Record<string, string | string[] | undefined | null> = {
      ...route.query,
    };
    if (value === defaultValue) delete nextQuery[queryKey];
    else nextQuery[queryKey] = value;

    syncingFromRoute = true;
    router
      .replace({ query: nextQuery as Record<string, string | string[]> })
      .finally(() => {
        // Allow route watcher after navigation settles.
        nextTick(() => {
          syncingFromRoute = false;
        });
      });
  }

  function setTab(value: T) {
    if (!(allowed as readonly string[]).includes(value)) return;
    if (tab.value === value) return;
    tab.value = value;
    writeStorage(value);
    applyQuery(value);
  }

  // Mirror ref → storage/URL when changed programmatically via tab.value = x
  watch(tab, (value) => {
    if (syncingFromRoute) return;
    writeStorage(value);
    applyQuery(value);
  });

  // Browser back/forward only (ignore our own replace)
  watch(
    () => route.query[queryKey],
    (q) => {
      if (syncingFromRoute) return;
      const parsed = parse(q) ?? defaultValue;
      if (parsed === tab.value) return;
      syncingFromRoute = true;
      tab.value = parsed;
      writeStorage(parsed);
      nextTick(() => {
        syncingFromRoute = false;
      });
    },
  );

  onActivated(() => {
    const preferred = queryValue() ?? readStorage() ?? defaultValue;
    if (preferred !== tab.value) {
      syncingFromRoute = true;
      tab.value = preferred;
      nextTick(() => {
        syncingFromRoute = false;
        applyQuery(preferred);
      });
    } else {
      applyQuery(tab.value);
    }
  });

  if (import.meta.client) {
    writeStorage(tab.value);
    // Align URL once without fighting hydration.
    nextTick(() => applyQuery(tab.value));
  }

  return { tab, setTab };
}

/**
 * Persist an arbitrary string filter (e.g. status dropdown).
 * Set syncQuery=false for high-churn fields like search (sessionStorage only).
 */
export function usePersistedQueryParam(
  storageKey: string,
  queryKey: string,
  defaultValue = "",
  opts?: { syncQuery?: boolean },
) {
  const syncQuery = opts?.syncQuery !== false;
  const route = useRoute();
  const router = useRouter();
  let syncingFromRoute = false;

  function readQuery(): string {
    if (!syncQuery) return "";
    const q = route.query[queryKey];
    const v = Array.isArray(q) ? q[0] : q;
    return typeof v === "string" ? v : "";
  }

  function readStorage(): string {
    if (!import.meta.client) return "";
    try {
      return sessionStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  }

  const initial = (syncQuery ? readQuery() : "") || readStorage() || defaultValue;
  const value = ref(initial);

  watch(
    value,
    (v) => {
      if (import.meta.client) {
        try {
          if (v) sessionStorage.setItem(storageKey, v);
          else sessionStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
      }
      if (!syncQuery || syncingFromRoute) return;
      const current = readQuery();
      if (current === v) return;
      const nextQuery: Record<string, string | string[] | undefined | null> = {
        ...route.query,
      };
      if (!v) delete nextQuery[queryKey];
      else nextQuery[queryKey] = v;
      syncingFromRoute = true;
      router
        .replace({ query: nextQuery as Record<string, string | string[]> })
        .finally(() => {
          nextTick(() => {
            syncingFromRoute = false;
          });
        });
    },
    { flush: "post" },
  );

  if (syncQuery) {
    watch(
      () => route.query[queryKey],
      () => {
        if (syncingFromRoute) return;
        const q = readQuery();
        if (q !== value.value) value.value = q;
      },
    );
  }

  return value;
}
