'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useToast } from '@/components/Toast'

interface ConnectionStatusProps {
    className?: string
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
    const {
        isConnected,
        serverInfo,
        connectToElectrum,
        disconnectFromElectrum,
        selectElectrumServer,
        testConnection,
        isLoading
    } = useWallet()

    const { showToast } = useToast()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    const handleConnect = async () => {
        try {
            await connectToElectrum()
            showToast({
                type: 'success',
                title: 'Connected',
                message: 'Successfully connected to ElectrumX server'
            })
        } catch (error) {
            console.error('Connection failed:', error)
            showToast({
                type: 'error',
                title: 'Connection Failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    const handleDisconnect = async () => {
        try {
            await disconnectFromElectrum()
            showToast({
                type: 'info',
                title: 'Disconnected',
                message: 'Disconnected from ElectrumX server'
            })
        } catch (error) {
            console.error('Disconnect failed:', error)
            showToast({
                type: 'error',
                title: 'Disconnect Failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    const handleServerSelect = async (index: number) => {
        try {
            await selectElectrumServer(index)
            setIsDropdownOpen(false)
            showToast({
                type: 'success',
                title: 'Server Selected',
                message: `Switched to ${serverInfo.servers[index]?.host || 'selected server'}`
            })
        } catch (error) {
            console.error('Server selection failed:', error)
            showToast({
                type: 'error',
                title: 'Server Selection Failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    const handleTest = async () => {
        setIsTesting(true)
        try {
            if (!isConnected) {
                // If not connected, try to connect first

                await connectToElectrum()
                // If connection succeeds, then test
                const result = await testConnection()
                showToast({
                    type: result ? 'success' : 'warning',
                    title: result ? 'Connection Test Passed' : 'Connection Test Failed',
                    message: result ? 'Server is responding to ping' : 'Server is not responding'
                })
            } else {
                // If already connected, just test
                const result = await testConnection()
                showToast({
                    type: result ? 'success' : 'warning',
                    title: result ? 'Ping Successful' : 'Ping Failed',
                    message: result ? 'Server is responding' : 'Server is not responding'
                })
            }
        } catch (error) {
            console.error('Connection test failed:', error)
            showToast({
                type: 'error',
                title: 'Test Failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Server Connection</h3>
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                    <span className={`text-sm font-medium ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Current Server:</p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                        {serverInfo.url || 'No server selected'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {!isConnected ? (
                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-avian-orange text-white text-sm rounded-md hover:bg-avian-orange-dark disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Connecting...' : 'Connect'}
                        </button>
                    ) : (
                        <button
                            onClick={handleDisconnect}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Disconnect
                        </button>
                    )}

                    <button
                        onClick={handleTest}
                        disabled={isLoading || isTesting}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTesting ? 'Testing...' : isConnected ? 'Ping Server' : 'Test Connection'}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                        >
                            Select Server
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                                <div className="py-1">
                                    {serverInfo.servers.map((server: any, index: number) => (
                                        <button
                                            key={index}
                                            onClick={() => handleServerSelect(index)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <div className="font-medium">{server.host}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {server.region} • {server.protocol}://{server.host}:{server.port}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
