// FamilyFlow service worker: app opent ook met slechte verbinding.
// Gezinsgegevens gaan altijd rechtstreeks naar Supabase en worden hier niet bewaard.
const CACHE = "familyflow-v2";
try { importScripts("/config.js"); } catch (e) { /* zonder config geen herinneringen */ }
const SHELL = ["/", "/config.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!sameOrigin && !fonts) return;
  if (fonts) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })));
    return;
  }
  // Eerst het netwerk (altijd de nieuwste versie), anders uit de cache.
  e.respondWith(
    fetch(e.request)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/"))),
  );
});

// Herinneringen: de push is leeg, de tekst halen we op bij de Edge Function.
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let titel = "FamilyFlow";
    let tekst = "Even inchecken?";
    try {
      if (e.data) {
        const d = e.data.json();
        titel = d.titel || titel;
        tekst = d.tekst || tekst;
      } else {
        const c = self.FF_CONFIG;
        const sub = await self.registration.pushManager.getSubscription();
        if (c && sub) {
          const res = await fetch(c.url.replace(/\/$/, "") + "/functions/v1/herinneringen", {
            method: "POST",
            headers: { apikey: c.anonKey, Authorization: "Bearer " + c.anonKey, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bericht", endpoint: sub.endpoint }),
          });
          const d = await res.json();
          titel = d.titel || titel;
          tekst = d.tekst || tekst;
        }
      }
    } catch (err) { /* dan de standaardtekst */ }
    await self.registration.showNotification(titel, { body: tekst, icon: "/icon-192.png", badge: "/icon-192.png", tag: "ff-herinnering", renotify: true, vibrate: [180, 90, 180] });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("/");
  }));
});
