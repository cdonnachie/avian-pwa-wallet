'use client';

import { useEffect } from 'react';

// Extend the Window interface
declare global {
  interface Window {
    unregisterServiceWorkers?: () => Promise<boolean>;
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // Check for service worker errors by attaching to the window object
          if (
            window.localStorage.getItem('sw_error_count') &&
            parseInt(window.localStorage.getItem('sw_error_count') || '0') > 3
          ) {
            await unregisterExistingServiceWorkers();
            window.localStorage.setItem('sw_error_count', '0');
          }

          // Register main service worker with proper scope configuration to avoid API interference
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
        } catch (error) {
          // Increment error count
          const errorCount = parseInt(window.localStorage.getItem('sw_error_count') || '0');
          window.localStorage.setItem('sw_error_count', (errorCount + 1).toString());
        }
      }
    };

    const unregisterExistingServiceWorkers = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        }

        return true;
      }
      return false;
    };

    // Expose the unregister function to the window for debugging
    window.unregisterServiceWorkers = unregisterExistingServiceWorkers;

    // Register immediately - no need to wait for window.load
    registerServiceWorker();
  }, []);

  // This component doesn't render anything
  return null;
}
