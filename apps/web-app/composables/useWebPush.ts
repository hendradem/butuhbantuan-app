// Manages Web Push subscription lifecycle for a specific ticket.
export function useWebPush(ticketNumber: Ref<string>) {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBaseUrl as string;

  const supported = computed(() =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
  );

  const permission = ref<NotificationPermission>('default');
  const subscribed = ref(false);
  const loading = ref(false);

  const storageKey = computed(() => `bb-push-${ticketNumber.value}`);

  onMounted(() => {
    if (!supported.value) return;
    permission.value = Notification.permission;
    subscribed.value = !!localStorage.getItem(storageKey.value);
  });

  async function getVapidKey(): Promise<string> {
    const res = await $fetch<{ data: { public_key: string } }>(`${apiBase}/api/v1/push/vapid-key`);
    return res.data.public_key;
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }

  async function subscribe() {
    if (!supported.value || subscribed.value) return;
    loading.value = true;
    try {
      const perm = await Notification.requestPermission();
      permission.value = perm;
      if (perm !== 'granted') return;

      const vapidKey = await getVapidKey();
      // Empty public key means push is not configured on the server.
      if (!vapidKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      await $fetch(`${apiBase}/api/v1/push/subscribe`, {
        method: 'POST',
        body: {
          ticket_number: ticketNumber.value,
          endpoint: json.endpoint,
          p256dh: (json.keys as Record<string, string>)?.p256dh ?? '',
          auth: (json.keys as Record<string, string>)?.auth ?? '',
        },
      });

      localStorage.setItem(storageKey.value, sub.endpoint);
      subscribed.value = true;
    } catch {
      // Silently fail — push is best-effort.
    } finally {
      loading.value = false;
    }
  }

  async function unsubscribe() {
    if (!supported.value || !subscribed.value) return;
    loading.value = true;
    try {
      const endpoint = localStorage.getItem(storageKey.value) ?? '';
      if (endpoint) {
        await $fetch(`${apiBase}/api/v1/push/subscribe`, {
          method: 'DELETE',
          body: { endpoint },
        });
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      localStorage.removeItem(storageKey.value);
      subscribed.value = false;
    } catch {
      // Silently fail.
    } finally {
      loading.value = false;
    }
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
