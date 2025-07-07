'use client';

import { useEffect, useState } from 'react';

// Create a file-level variable to prevent multiple registrations
let hasRegistered = false;

// Define the window.workbox type for TypeScript
declare global {
    interface Window {
        workbox?: {
            register: () => Promise<void>;
        };
    }
}

/**
 * Hook to manage service worker registration
 * Returns the registration status and any errors
 */
export function useServiceWorker() {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isRegistering, setIsRegistering] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || hasRegistered) {
            return;
        }

        // Set the flag to prevent duplicate registrations
        hasRegistered = true;

        const registerServiceWorker = async () => {
            setIsRegistering(true);
            try {
                let currentRegistration: ServiceWorkerRegistration | null = null;

                // Try to use window.workbox if available (next-pwa provides this)
                if (window.workbox) {
                    console.log('Using Workbox to register service worker');
                    await window.workbox.register();

                    // Get the registration after it's complete
                    const regs = await navigator.serviceWorker.getRegistrations();
                    currentRegistration = regs.find(r =>
                        r.scope === window.location.origin + '/' ||
                        r.scope === window.location.origin
                    ) || null;

                    if (currentRegistration) {
                        console.log('Service worker registered via Workbox:', currentRegistration);
                    }
                } else {
                    // Fallback to manual registration
                    currentRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    console.log('Service worker registered manually:', currentRegistration);
                }

                // Set the registration state
                if (currentRegistration) {
                    setRegistration(currentRegistration);

                    // Set up event handlers for future updates
                    currentRegistration.onupdatefound = () => {
                        const installingWorker = currentRegistration?.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('New service worker is installed, but waiting to activate');
                                    } else {
                                        console.log('Service worker installed for the first time');
                                    }
                                }
                            };
                        }
                    };
                }
            } catch (err: any) {
                setError(err);
                console.error('Service worker registration failed:', err);
            } finally {
                setIsRegistering(false);
            }
        };

        registerServiceWorker();

        return () => {
            // Cleanup if needed
        };
    }, []);

    return { registration, error, isRegistering };
}

/**
 * Component that handles service worker registration
 * No UI, just functionality
 */
export function ServiceWorkerRegistrar() {
    const [isMounted, setIsMounted] = useState(false);

    // Only register after component mounts on client
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Use the hook unconditionally to follow React rules
    const swStatus = useServiceWorker();

    if (!isMounted) {
        return null;
    }

    return null;
}
