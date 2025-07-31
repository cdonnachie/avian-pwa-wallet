'use client';

export interface DataWipeResult {
    success: boolean;
    errors: string[];
}

export class DataWipeService {
    /**
     * Detect iOS Safari for specific handling
     */
    private static isIOSSafari(): boolean {
        if (typeof window === 'undefined') return false;
        const ua = window.navigator.userAgent;
        const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const webkit = /WebKit/.test(ua);
        const chrome = /CriOS|Chrome/.test(ua);
        return iOS && webkit && !chrome;
    }

    /**
     * Wipe all application data and start fresh
     */
    static async wipeAllData(): Promise<DataWipeResult> {
        const result: DataWipeResult = {
            success: true,
            errors: [],
        };

        const isIOS = DataWipeService.isIOSSafari();
        console.info('Starting complete data wipe...', { isIOS, userAgent: navigator.userAgent });

        try {
            // Clear localStorage
            try {
                localStorage.clear();
                console.debug('localStorage cleared successfully');
            } catch (error) {
                const errorMsg = `localStorage clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                result.errors.push(errorMsg);
                console.error(errorMsg, error);
            }

            // Clear sessionStorage
            try {
                sessionStorage.clear();
                console.debug('sessionStorage cleared successfully');
            } catch (error) {
                const errorMsg = `sessionStorage clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                result.errors.push(errorMsg);
                console.error(errorMsg, error);
            }

            // Delete IndexedDB databases - with iOS-specific handling
            if ('indexedDB' in window) {
                try {
                    const dbName = 'AvianFlightDeck';


                    if (isIOS) {
                        // iOS Safari sometimes requires multiple attempts and different approaches
                        console.info('Attempting iOS-compatible IndexedDB deletion');

                        // First, try to open and close the database to ensure it's not in use
                        try {
                            const openRequest = indexedDB.open(dbName);
                            await new Promise((resolve, reject) => {
                                openRequest.onsuccess = () => {
                                    openRequest.result.close();
                                    resolve(true);
                                };
                                openRequest.onerror = () => reject(openRequest.error);
                                // Set a timeout in case the request hangs
                                setTimeout(() => reject(new Error('IndexedDB open timeout')), 5000);
                            });
                        } catch (openError) {
                            console.warn('Could not open IndexedDB before deletion (may not exist)', openError);
                        }

                        // Wait a moment for iOS to process
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                    // Attempt deletion with timeout
                    const deleteRequest = indexedDB.deleteDatabase(dbName);
                    await new Promise((resolve, reject) => {
                        deleteRequest.onsuccess = () => {
                            console.debug('IndexedDB deleted successfully');
                            resolve(true);
                        };
                        deleteRequest.onerror = () => reject(deleteRequest.error);
                        deleteRequest.onblocked = () => {
                            console.warn('IndexedDB deletion blocked - may require app restart');
                            // On iOS, blocked deletion is common - treat as partial success
                            if (isIOS) {
                                resolve(true);
                            } else {
                                reject(new Error('Database deletion blocked'));
                            }
                        };
                        // Set a timeout for iOS Safari which can hang
                        setTimeout(() => {
                            if (isIOS) {
                                console.warn('IndexedDB deletion timeout on iOS - continuing');
                                resolve(true);
                            } else {
                                reject(new Error('IndexedDB deletion timeout'));
                            }
                        }, isIOS ? 3000 : 10000);
                    });


                } catch (error) {
                    const errorMsg = `IndexedDB deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg, error);
                }
            } else {
                console.warn('IndexedDB not available in this browser');
            }

            // Clear caches - with iOS-specific handling
            if ('caches' in window) {
                try {
                    console.info('Clearing cache storage...');
                    const cacheNames = await caches.keys();
                    console.debug('Found cache names:', cacheNames);

                    if (cacheNames.length > 0) {
                        const deletePromises = cacheNames.map(async (cacheName) => {
                            try {
                                const deleted = await caches.delete(cacheName);
                                console.debug(`Cache '${cacheName}' deleted:`, deleted);
                                return deleted;
                            } catch (error) {
                                console.warn(`Failed to delete cache '${cacheName}':`, error);
                                return false;
                            }
                        });

                        if (isIOS) {
                            // iOS Safari can be flaky with Promise.all for cache operations
                            for (const promise of deletePromises) {
                                try {
                                    await promise;
                                    // Small delay between cache deletions on iOS
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                } catch (error) {
                                    console.warn('Cache deletion failed on iOS:', error);
                                }
                            }
                        } else {
                            await Promise.all(deletePromises);
                        }

                        console.info('Cache storage cleared successfully');
                    } else {
                        console.debug('No caches found to clear');
                    }
                } catch (error) {
                    const errorMsg = `Cache cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg, error);
                }
            } else {
                console.warn('Cache API not available in this browser');
            }

            // Unregister service workers - with iOS considerations
            if ('serviceWorker' in navigator) {
                try {
                    console.info('Unregistering service workers...');
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    console.debug(`Found ${registrations.length} service worker registrations`);

                    if (registrations.length > 0) {
                        if (isIOS) {
                            // iOS Safari can have issues with concurrent service worker operations
                            for (const registration of registrations) {
                                try {
                                    await registration.unregister();
                                    console.debug('Service worker unregistered successfully');
                                    // Small delay between operations on iOS
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                } catch (error) {
                                    console.warn('Service worker unregistration failed on iOS:', error);
                                }
                            }
                        } else {
                            await Promise.all(registrations.map(registration => registration.unregister()));
                            console.debug('All service workers unregistered successfully');
                        }
                    } else {
                        console.debug('No service workers found to unregister');
                    }
                } catch (error) {
                    const errorMsg = `Service worker cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    result.errors.push(errorMsg);
                    console.error(errorMsg, error);
                }
            } else {
                console.warn('Service Worker API not available in this browser');
            }

            console.info('Data wipe completed successfully', {
                errors: result.errors.length,
                isIOS
            });

            if (result.errors.length > 0) {
                console.warn('Data wipe completed with some warnings:', result.errors);
            }

        } catch (error) {
            console.error('Critical error during data wipe:', error);
            result.success = false;
            result.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return result;
    }

    /**
     * Reload the page after wiping data
     */
    static reloadApp(): void {
        window.location.href = '/';
    }
}
