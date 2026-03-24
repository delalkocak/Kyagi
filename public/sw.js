// Kyagi Push Notification Service Worker

self.addEventListener("push", (event) => {
  let data = { title: "kyagi", body: "you have a new notification", route: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    // fallback
  }
  const options = {
    body: data.body,
    icon: "/kyagi-icon-192.png",
    badge: "/kyagi-icon-192.png",
    data: { route: data.route || data.data?.route || "/" },
    vibrate: [100, 50, 100],
    tag: data.tag || "kyagi-notification",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: "NOTIFICATION_CLICK", route });
          return;
        }
      }
      return clients.openWindow(route);
    })
  );
});
