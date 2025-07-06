'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Key, Download, RefreshCw, Upload } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'

interface WalletRecoveryProps {
    onClose?: () => void
}

export default function WalletRecovery({ onClose }: WalletRecoveryProps) {
    const { wallet } = useWallet()
    const [recoveryInfo, setRecoveryInfo] = useState<{
        hasWallet: boolean
        isEncrypted: boolean
        recoveryOptions: string[]
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkRecoveryOptions = async () => {
            if (wallet) {
                try {
                    const info = await wallet.checkWalletRecoveryOptions()
                    setRecoveryInfo(info)
                } catch (error) {
                    console.error('Failed to check recovery options:', error)
                } finally {
                    setIsLoading(false)
                }
            }
        }

        checkRecoveryOptions()
    }, [wallet])

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-avian-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Checking wallet status...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center mb-4">
                    <AlertCircle className="w-6 h-6 text-yellow-500 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">
                        {recoveryInfo?.hasWallet ? 'Wallet Recovery' : 'No Wallet Found'}
                    </h2>
                </div>

                {!recoveryInfo?.hasWallet ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-yellow-800">Important Information</h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Private keys cannot be recreated or recovered once lost. Each private key is a unique cryptographic number that controls access to your wallet.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Your Options:</h3>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Generate New Wallet</h4>
                                        <p className="text-sm text-gray-600">Creates a brand new wallet with a new private key and address. Previous funds will not be accessible.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <Upload className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Import Existing Private Key</h4>
                                        <p className="text-sm text-gray-600">If you have a backup of your private key (WIF format), you can restore your existing wallet.</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <Download className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Check Backups</h4>
                                        <p className="text-sm text-gray-600">Look for wallet backups in your files, email, or other secure storage locations.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-red-800">Security Reminder</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        Always backup your private key securely. Store it in multiple secure locations. Never share it with anyone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <Key className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-green-800">Wallet Found</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        Your wallet exists and is {recoveryInfo.isEncrypted ? 'encrypted' : 'not encrypted'}.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Available Actions:</h3>
                            <div className="space-y-2">
                                {recoveryInfo.recoveryOptions.map((option, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <p className="text-sm text-gray-700">{option}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    )}
                    <button
                        onClick={() => {
                            // Navigate to wallet settings
                            if (onClose) onClose()
                            // You might want to trigger navigation here
                        }}
                        className="px-4 py-2 bg-avian-600 text-white rounded-lg hover:bg-avian-700 transition-colors"
                    >
                        Go to Wallet Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
