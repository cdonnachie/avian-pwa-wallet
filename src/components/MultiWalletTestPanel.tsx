'use client'

import React, { useState } from 'react'
import { MultiWalletTester, TestResult } from '@/utils/multi-wallet-test'

export function MultiWalletTestPanel() {
    const [testResults, setTestResults] = useState<string>('')
    const [isRunning, setIsRunning] = useState(false)

    const runTests = async () => {
        setIsRunning(true)
        setTestResults('Running tests...\n')

        try {
            const results = await MultiWalletTester.runAllTests()
            setTestResults(results)
        } catch (error) {
            setTestResults(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setIsRunning(false)
        }
    }

    const clearResults = () => {
        setTestResults('')
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Multi-Wallet Test Panel
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={runTests}
                        disabled={isRunning}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isRunning ? 'Running...' : 'Run Tests'}
                    </button>
                    <button
                        onClick={clearResults}
                        disabled={isRunning}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[300px]">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                    {testResults || 'Click "Run Tests" to test multi-wallet functionality'}
                </pre>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Test Coverage:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Creating multiple wallets</li>
                    <li>Switching between wallets</li>
                    <li>Updating wallet names</li>
                    <li>Deleting wallets</li>
                    <li>Legacy method compatibility</li>
                    <li>WalletService integration</li>
                    <li>IndexedDB storage operations</li>
                </ul>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> These tests will create and delete test wallets in your IndexedDB.
                    They should not affect your real wallet data, but run with caution in production.
                </p>
            </div>
        </div>
    )
}
