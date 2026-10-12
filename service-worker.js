
const CACHE_NAME = "neon-study-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Install the service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .catch((error) => {
        console.error("NEON STUDY cache error:", error);
      })
  );

  self.skipWaiting();
});

// Activate and remove old NEON STUDY caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) =>
            key.startsWith("neon-study-") &&
            key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Serve cached files when offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Do not cache Supabase/API requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }

        return new Response("Offline. Please reconnect to the internet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
  );
});

// Handle incoming Web Push notifications
self.addEventListener("push", (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "NEON STUDY";
  const options = {
    body: data.body || "You have an upcoming study deadline.",
    icon: data.icon || "./neon-icon.png",
    badge: data.badge || "./neon-icon.png",
    tag: data.tag || "neon-study-reminder",
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Open NEON STUDY when the notification is tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "./",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((windows) => {
      for (const windowClient of windows) {
        if (windowClient.url.startsWith(self.location.origin)) {
          return windowClient.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});
