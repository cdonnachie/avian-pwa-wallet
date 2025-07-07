'use client';

import { useEffect, useState } from 'react';

// Create a file-level variable to prevent multiple registrations
let hasRegistered = false;

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
                const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                setRegistration(reg);
                console.log('Service worker registered successfully:', reg);

                // Handle updates
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
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
