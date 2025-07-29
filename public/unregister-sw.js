/**
 * This script helps update the service worker to avoid caching issues.
 * Run this to unregister any existing service workers
 */

function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}

// Export the function so it can be used in the console
window.unregisterServiceWorkers = unregisterServiceWorkers;

// Execute immediately
unregisterServiceWorkers();

// Also clear the caches
if ('caches' in window) {
  caches
    .keys()
    .then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          return caches.delete(cacheName);
        }),
      );
    })
    .then(() => {});
}
