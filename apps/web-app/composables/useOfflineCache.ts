const CACHE_KEY = "bb-offline-emergency-v1";
const TYPES_KEY = "bb-offline-types-v1";
const HOTLINE_KEY = "bb-offline-hotlines-v1";

export type OfflineEmergencyCache = {
  savedAt: string;
  lat: number;
  lng: number;
  regionName: string;
  isCovered: boolean;
  emergencies: any[];
};

export type OfflineHotlines = {
  psc: string;
  label: string;
  extras?: { label: string; tel: string }[];
};

const DEFAULT_HOTLINES: OfflineHotlines = {
  psc: "119",
  label: "PSC 119",
  extras: [
    { label: "Pemadam Kebakaran", tel: "113" },
    { label: "Polisi", tel: "110" },
  ],
};

function readJson<T>(key: string): T | null {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/**
 * Offline helpers for citizen web-app: last-good emergency snapshot + national hotlines.
 */
export function useOfflineCache() {
  const online = useState("bb-online", () => true);
  const fromCache = useState("bb-from-cache", () => false);

  function syncOnlineFlag() {
    if (!import.meta.client) return;
    online.value = navigator.onLine;
  }

  function saveEmergencySnapshot(payload: OfflineEmergencyCache) {
    writeJson(CACHE_KEY, payload);
    fromCache.value = false;
  }

  function loadEmergencySnapshot(): OfflineEmergencyCache | null {
    return readJson<OfflineEmergencyCache>(CACHE_KEY);
  }

  function saveTypes(types: any[]) {
    writeJson(TYPES_KEY, { savedAt: new Date().toISOString(), types });
  }

  function loadTypes(): any[] {
    const raw = readJson<{ types: any[] }>(TYPES_KEY);
    return raw?.types ?? [];
  }

  function hotlines(): OfflineHotlines {
    return readJson<OfflineHotlines>(HOTLINE_KEY) ?? DEFAULT_HOTLINES;
  }

  function saveHotlines(h: OfflineHotlines) {
    writeJson(HOTLINE_KEY, h);
  }

  function markFromCache(v: boolean) {
    fromCache.value = v;
  }

  onMounted(() => {
    syncOnlineFlag();
    window.addEventListener("online", syncOnlineFlag);
    window.addEventListener("offline", syncOnlineFlag);
  });

  onUnmounted(() => {
    if (!import.meta.client) return;
    window.removeEventListener("online", syncOnlineFlag);
    window.removeEventListener("offline", syncOnlineFlag);
  });

  return {
    online,
    fromCache,
    syncOnlineFlag,
    saveEmergencySnapshot,
    loadEmergencySnapshot,
    saveTypes,
    loadTypes,
    hotlines,
    saveHotlines,
    markFromCache,
    DEFAULT_HOTLINES,
  };
}
