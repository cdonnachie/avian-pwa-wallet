'use client';

/**
 * This file provides utilities to check and debug the service worker status.
 * It can help diagnose issues with the PWA in production.
 */

// Check if the service worker is registered and working
export async function checkServiceWorkerStatus() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return {
            supported: false,
            registered: false,
            active: false,
            error: 'Service Worker API not supported'
        };
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();

        const result = {
            supported: true,
            registered: registrations.length > 0,
            active: false,
            registrations: registrations.map(reg => ({
                scope: reg.scope,
                updateViaCache: reg.updateViaCache,
                active: !!reg.active,
                installing: !!reg.installing,
                waiting: !!reg.waiting,
                url: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL
            }))
        };

        result.active = result.registrations.some(r => r.active);

        return result;
    } catch (error: any) {
        console.error('Error checking service worker status:', error);
        return {
            supported: true,
            registered: false,
            active: false,
            error: error?.message || String(error)
        };
    }
}

// Register the service worker manually if needed
export async function registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        console.error('Service Worker API not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service Worker registered successfully:', registration);
        return true;
    } catch (error: any) {
        console.error('Service Worker registration failed:', error);
        return false;
    }
}

// Unregister all service workers
export async function unregisterServiceWorkers() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
        return true;
    } catch (error: any) {
        console.error('Error unregistering service workers:', error);
        return false;
    }
}
