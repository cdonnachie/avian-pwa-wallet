'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { testIndexedDBStorage, clearTestData } from '@/utils/storage-test'
import { StorageService } from '@/services/StorageService'

// This component is for development testing only
// Remove or disable in production
export default function StorageTestPanel() {
    const [output, setOutput] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isVisible, setIsVisible] = useState(true)

    const runTest = async () => {
        setIsLoading(true)
        setOutput('Running IndexedDB tests...\n')

        // Capture console.log output
        const originalLog = console.log
        let testOutput = ''

        console.log = (...args) => {
            testOutput += args.join(' ') + '\n'
            originalLog(...args)
        }

        try {
            await testIndexedDBStorage()
            setOutput(testOutput)
        } catch (error) {
            setOutput(testOutput + '\nError: ' + error)
        } finally {
            console.log = originalLog
            setIsLoading(false)
        }
    }

    const clearData = async () => {
        setIsLoading(true)
        try {
            await clearTestData()
            setOutput('Test data cleared successfully!')
        } catch (error) {
            setOutput('Error clearing data: ' + error)
        } finally {
            setIsLoading(false)
        }
    }

    const getDbInfo = async () => {
        setIsLoading(true)
        try {
            const info = await StorageService.getDatabaseInfo()
            setOutput(`Database Info:\nWallets: ${info.wallets}\nTransactions: ${info.transactions}\nPreferences: ${info.preferences}`)
        } catch (error) {
            setOutput('Error getting database info: ' + error)
        } finally {
            setIsLoading(false)
        }
    }

    // Only show in development
    if (process.env.NODE_ENV === 'production' || !isVisible) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-md z-50">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Storage Test Panel (Dev Only)
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2 mb-3">
                <button
                    onClick={runTest}
                    disabled={isLoading}
                    className="w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Running...' : 'Test IndexedDB'}
                </button>

                <button
                    onClick={getDbInfo}
                    disabled={isLoading}
                    className="w-full px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                >
                    Database Info
                </button>

                <button
                    onClick={clearData}
                    disabled={isLoading}
                    className="w-full px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                >
                    Clear Test Data
                </button>
            </div>

            {output && (
                <div className="mt-3">
                    <textarea
                        value={output}
                        readOnly
                        className="w-full h-32 text-xs font-mono bg-gray-100 dark:bg-gray-900 border rounded p-2 resize-none"
                    />
                </div>
            )}
        </div>
    )
}
