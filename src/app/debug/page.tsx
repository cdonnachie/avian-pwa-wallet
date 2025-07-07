'use client';

import { useEffect, useState } from 'react';
import { checkServiceWorkerStatus, registerServiceWorker, unregisterServiceWorkers } from '@/utils/sw-helpers';

export default function PWADebugPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const checkStatus = async () => {
        setLoading(true);
        const result = await checkServiceWorkerStatus();
        setStatus(result);
        setLoading(false);
    };

    const handleRegister = async () => {
        setMessage('Attempting to register service worker...');
        const success = await registerServiceWorker();
        setMessage(success ? 'Service worker registered successfully!' : 'Failed to register service worker.');
        checkStatus();
    };

    const handleUnregister = async () => {
        setMessage('Unregistering service workers...');
        const success = await unregisterServiceWorkers();
        setMessage(success ? 'Service workers unregistered successfully!' : 'Failed to unregister service workers.');
        checkStatus();
    };

    useEffect(() => {
        checkStatus();
    }, []);

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">PWA Debug</h1>

            <div className="mb-6 space-y-2">
                <button
                    onClick={checkStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                    disabled={loading}
                >
                    {loading ? 'Checking...' : 'Check Status'}
                </button>

                <button
                    onClick={handleRegister}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
                >
                    Register SW
                </button>

                <button
                    onClick={handleUnregister}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Unregister SWs
                </button>
            </div>

            {message && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                    {message}
                </div>
            )}

            {status && (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Service Worker Status</h2>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="font-medium">Supported:</div>
                        <div>{status.supported ? '✅ Yes' : '❌ No'}</div>

                        <div className="font-medium">Registered:</div>
                        <div>{status.registered ? '✅ Yes' : '❌ No'}</div>

                        <div className="font-medium">Active:</div>
                        <div>{status.active ? '✅ Yes' : '❌ No'}</div>
                    </div>

                    {status.error && (
                        <div className="text-red-600 mb-4">
                            <strong>Error:</strong> {status.error}
                        </div>
                    )}

                    {status.registrations && status.registrations.length > 0 ? (
                        <div>
                            <h3 className="text-lg font-medium mb-2">Registrations</h3>
                            <div className="space-y-4">
                                {status.registrations.map((reg: any, i: number) => (
                                    <div key={i} className="bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                                        <div><span className="font-medium">Scope:</span> {reg.scope}</div>
                                        <div><span className="font-medium">Update Via Cache:</span> {reg.updateViaCache}</div>
                                        <div><span className="font-medium">URL:</span> {reg.url || 'N/A'}</div>
                                        <div className="grid grid-cols-3 gap-1 mt-2">
                                            <div className={`p-1 text-center rounded ${reg.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                {reg.active ? 'Active ✓' : 'Not Active'}
                                            </div>
                                            <div className={`p-1 text-center rounded ${reg.installing ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                {reg.installing ? 'Installing ✓' : 'Not Installing'}
                                            </div>
                                            <div className={`p-1 text-center rounded ${reg.waiting ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                {reg.waiting ? 'Waiting ✓' : 'Not Waiting'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : status.registered ? (
                        <div className="text-yellow-600">
                            Service worker registered but no details available.
                        </div>
                    ) : (
                        <div className="text-gray-600">
                            No service worker registrations found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
