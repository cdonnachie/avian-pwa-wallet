'use client'

import { useState, useEffect } from 'react'
import { Lock, Fingerprint, Eye, EyeOff, Shield, Clock, Wallet } from 'lucide-react'
import { securityService } from '@/services/SecurityService'
import { StorageService } from '@/services/StorageService'
import { useToast } from '@/components/Toast'

interface SecurityLockScreenProps {
    onUnlock: () => void
    lockReason?: 'timeout' | 'manual' | 'failed_auth'
}

interface ActiveWalletInfo {
    name: string
    address: string
    isEncrypted: boolean
}

export default function SecurityLockScreen({ onUnlock, lockReason }: SecurityLockScreenProps) {
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [biometricAvailable, setBiometricAvailable] = useState(false)
    const [activeWallet, setActiveWallet] = useState<ActiveWalletInfo | null>(null)
    const [error, setError] = useState('')
    const { showToast } = useToast()

    useEffect(() => {
        checkBiometricSupport()
        loadActiveWalletInfo()
    }, [])

    const loadActiveWalletInfo = async () => {
        try {
            const wallet = await StorageService.getActiveWallet()
            if (wallet) {
                setActiveWallet({
                    name: wallet.name,
                    address: wallet.address,
                    isEncrypted: wallet.isEncrypted
                })
            }
        } catch (error) {
            console.error('Failed to load active wallet info:', error)
        }
    }

    const checkBiometricSupport = async () => {
        const capabilities = await securityService.getBiometricCapabilities()
        setBiometricAvailable(capabilities.isSupported)
    }

    const handlePasswordUnlock = async () => {
        // If wallet doesn't require a password, unlock immediately
        if (!activeWallet?.isEncrypted) {
            handleUnlockSuccess('No password required for this wallet')
            return
        }

        if (!password) {
            setError('Please enter your password')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            const success = await securityService.unlockWallet(password, false)
            if (success) {
                handleUnlockSuccess('Welcome back!')
            } else {
                setError('Invalid password')
            }
        } catch (error) {
            setError('Failed to unlock wallet')
            console.error('Unlock error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUnlockSuccess = (message: string) => {
        showToast({
            type: 'success',
            title: 'Wallet unlocked',
            message
        })
        onUnlock()
    }

    const handleBiometricUnlock = async () => {
        if (!biometricAvailable) return

        setIsLoading(true)
        setError('')

        try {
            const success = await securityService.unlockWallet(undefined, true)
            if (success) {
                handleUnlockSuccess('Biometric authentication successful')
            } else {
                setError('Biometric authentication failed')
            }
        } catch (error) {
            setError('Biometric authentication failed')
            console.error('Biometric unlock error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getLockReasonMessage = () => {
        switch (lockReason) {
            case 'timeout':
                return 'Your wallet was locked due to inactivity'
            case 'failed_auth':
                return 'Your wallet was locked due to failed authentication attempts'
            case 'manual':
                return 'Your wallet is locked for security'
            default:
                return 'Your wallet is locked for security'
        }
    }

    const getLockReasonIcon = () => {
        switch (lockReason) {
            case 'timeout':
                return <Clock className="w-6 h-6 text-amber-500" />
            case 'failed_auth':
                return <Shield className="w-6 h-6 text-red-500" />
            default:
                return <Lock className="w-6 h-6 text-blue-500" />
        }
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        {getLockReasonIcon()}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Wallet Locked
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {getLockReasonMessage()}
                    </p>
                </div>

                {/* Active Wallet Info */}
                {activeWallet && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                        <div className="flex items-center mb-2">
                            <Wallet className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Active Wallet
                            </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <div className="flex justify-between">
                                <span>Name:</span>
                                <span className="font-medium">{activeWallet.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Address:</span>
                                <span className="font-mono text-xs">
                                    {activeWallet.address.slice(0, 8)}...{activeWallet.address.slice(-8)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Protection:</span>
                                <span className={`font-medium ${activeWallet.isEncrypted ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {activeWallet.isEncrypted ? 'Password Protected' : 'No Password'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Biometric Authentication */}
                {biometricAvailable && (
                    <div className="mb-6">
                        <button
                            onClick={handleBiometricUnlock}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            <Fingerprint className="w-5 h-5 mr-2" />
                            {isLoading ? 'Authenticating...' : 'Unlock with Biometric'}
                        </button>

                        <div className="flex items-center my-4">
                            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="px-3 text-sm text-gray-500 dark:text-gray-400">OR</span>
                            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                    </div>
                )}

                {/* Password Authentication */}
                {activeWallet?.isEncrypted ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Wallet Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordUnlock()}
                                    placeholder="Enter your wallet password"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-12"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handlePasswordUnlock}
                            disabled={isLoading || (activeWallet?.isEncrypted && !password)}
                            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                            <Lock className="w-5 h-5 mr-2" />
                            {isLoading ? 'Unlocking...' : 'Unlock Wallet'}
                        </button>
                    </div>
                ) : (
                    /* No Password Required */
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                            <div className="flex items-center">
                                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-800 dark:text-amber-200">
                                        No Password Required
                                    </p>
                                    <p className="text-amber-700 dark:text-amber-300">
                                        This wallet is not password protected
                                    </p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handlePasswordUnlock}
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                            <Lock className="w-5 h-5 mr-2" />
                            {isLoading ? 'Unlocking...' : 'Unlock Wallet'}
                        </button>
                    </div>
                )}

                {/* Security Notice */}
                <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <div className="flex items-start">
                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-800 dark:text-amber-200">
                            <p className="font-medium">Security Notice</p>
                            <p>Your wallet is protected by advanced security features. All access attempts are logged for your security.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
