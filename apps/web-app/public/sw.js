// ButuhBantuan Service Worker — handles Web Push notifications for ticket updates.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'ButuhBantuan', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ButuhBantuan', {
      body: data.body || 'Status tiket kamu diperbarui.',
      icon: '/ambulance-logo.jpg',
      badge: '/ambulance-logo.jpg',
      tag: 'ticket-update',
      renotify: true,
      data: { url: self.location.origin },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(clients.matchAll({ type: 'window' }).then((windowClients) => {
    for (const client of windowClients) {
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
