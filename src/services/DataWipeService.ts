'use client';

export interface DataWipeResult {
    success: boolean;
    errors: string[];
}

export class DataWipeService {
    /**
     * Wipe all application data and start fresh
     */
    static async wipeAllData(): Promise<DataWipeResult> {
        const result: DataWipeResult = {
            success: true,
            errors: [],
        };

        // eslint-disable-next-line no-console
        console.info('Starting complete data wipe...');

        try {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Delete IndexedDB databases
            if ('indexedDB' in window) {
                try {
                    // Try to get all databases and delete them
                    if ('databases' in indexedDB) {
                        const databases = await indexedDB.databases();
                        for (const db of databases) {
                            if (db.name) {
                                indexedDB.deleteDatabase(db.name);
                            }
                        }
                    } else {
                        // Fallback: delete common database names
                        const commonDatabases = ['avian-wallet-db', 'wallet-cache', 'transaction-db'];
                        for (const dbName of commonDatabases) {
                            (indexedDB as IDBFactory).deleteDatabase(dbName);
                        }
                    }
                } catch (error) {
                    result.errors.push(`IndexedDB cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Clear caches
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
                } catch (error) {
                    result.errors.push(`Cache cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(registration => registration.unregister()));
                } catch (error) {
                    result.errors.push(`Service worker cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // eslint-disable-next-line no-console
            console.info('Data wipe completed successfully');

            if (result.errors.length > 0) {
                // eslint-disable-next-line no-console
                console.warn('Data wipe completed with some warnings:', result.errors);
            }

        } catch (error) {
            // eslint-disable-next-line no-console
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
        window.location.reload();
    }
}
