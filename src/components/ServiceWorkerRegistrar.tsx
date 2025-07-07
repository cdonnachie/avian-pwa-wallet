'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        // Only run on client-side and in production
        if (typeof window === 'undefined') return;

        const registerServiceWorker = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service worker registered successfully:', registration);
                } catch (error) {
                    console.error('Service worker registration failed:', error);
                }
            } else {
                console.log('Service workers not supported in this browser');
            }
        };

        // Register immediately - no need to wait for window.load
        registerServiceWorker();
    }, []);

    // This component doesn't render anything
    return null;
}
