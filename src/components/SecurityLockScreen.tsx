'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Fingerprint, ScanFace, Eye, EyeOff, Shield, Clock, Wallet } from 'lucide-react'
import { securityService } from '@/services/SecurityService'
import { StorageService } from '@/services/StorageService'
import { useToast } from '@/components/Toast'
import GradientBackground from '@/components/GradientBackground'
import ThemeSwitcher from '@/components/ThemeSwitcher'

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
    const [biometricSupported, setBiometricSupported] = useState(false)
    const [biometricSetup, setBiometricSetup] = useState(false)
    const [biometricTypes, setBiometricTypes] = useState<string[]>([])
    const [activeWallet, setActiveWallet] = useState<ActiveWalletInfo | null>(null)
    const [error, setError] = useState('')
    const [isLockedOut, setIsLockedOut] = useState(false)
    const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0)
    const { showToast } = useToast()

    const checkLockoutStatus = useCallback(() => {
        const lockedOut = securityService.isLockedOut()
        const timeRemaining = securityService.getRemainingLockoutTime()

        setIsLockedOut(lockedOut)
        setLockoutTimeRemaining(timeRemaining)

        if (lockedOut) {
            setError(`Too many failed attempts. Please wait ${Math.ceil(timeRemaining / 1000)} seconds before trying again.`)
        } else if (error.includes('Too many failed attempts')) {
            setError('')
        }
    }, [error])

    useEffect(() => {
        const init = async () => {
            await loadActiveWalletInfo()
            await checkBiometricSupport()
            checkLockoutStatus()
        }

        init()

        // Update lockout timer every second if locked out
        const lockoutInterval = setInterval(() => {
            if (isLockedOut) {
                checkLockoutStatus()
            }
        }, 1000)

        return () => clearInterval(lockoutInterval)
    }, [isLockedOut, checkLockoutStatus])

    // Re-check biometric support when activeWallet changes
    useEffect(() => {
        if (activeWallet) {
            checkBiometricSupport()
        }
    }, [activeWallet])

    // Listen for security settings changes
    useEffect(() => {
        const handleSecuritySettingsChange = () => {
            checkBiometricSupport();
        };

        // Add event listener for security settings changes
        window.addEventListener('security-settings-changed', handleSecuritySettingsChange);

        return () => {
            window.removeEventListener('security-settings-changed', handleSecuritySettingsChange);
        };
    }, []);

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
        // First check if biometrics are available and enabled globally
        const biometricAuthAvailable = await securityService.isBiometricAuthAvailable();

        if (!biometricAuthAvailable) {
            // If biometrics are not available or globally disabled, don't show any biometric options
            setBiometricSupported(false);
            setBiometricSetup(false);
            setBiometricAvailable(false);
            return;
        }

        // If biometrics are available, get detailed capabilities
        const capabilities = await securityService.getBiometricCapabilities();
        setBiometricSupported(capabilities.isSupported);
        setBiometricTypes(capabilities.availableTypes);

        // Check if biometric is set up for this specific wallet
        const hasCredential = await StorageService.getBiometricCredential();

        // Get active wallet to check if biometrics are set up for it specifically
        const wallet = await StorageService.getActiveWallet();
        let walletHasBiometrics = false;

        if (wallet) {
            walletHasBiometrics = await StorageService.isBiometricEnabledForWallet(wallet.address);
        }

        // Only show biometrics if they're enabled globally, have credentials, 
        // AND are specifically set up for this wallet
        const biometricsAvailable = capabilities.isSupported && hasCredential !== null && walletHasBiometrics;

        setBiometricSetup(biometricsAvailable);
        setBiometricAvailable(biometricsAvailable);
    }

    const handlePasswordUnlock = async () => {
        // Check if currently locked out
        if (isLockedOut) {
            setError(`Too many failed attempts. Please wait ${Math.ceil(lockoutTimeRemaining / 1000)} seconds before trying again.`)
            return
        }

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
                // Check lockout status after failed attempt
                checkLockoutStatus()
            }
        } catch (error: any) {
            // Handle lockout error specifically
            if (error.message && error.message.includes('Too many failed attempts')) {
                setError(error.message)
                checkLockoutStatus()
            } else {
                setError('Failed to unlock wallet')
                console.error('Unlock error:', error)
            }
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

        // Check if currently locked out
        if (isLockedOut) {
            setError(`Too many failed attempts. Please wait ${Math.ceil(lockoutTimeRemaining / 1000)} seconds before trying again.`)
            return
        }

        setIsLoading(true)
        setError('')

        try {
            // With biometric authentication, the password is retrieved from secure storage
            // The second parameter 'true' indicates to use biometric authentication
            const success = await securityService.unlockWallet(undefined, true)
            if (success) {
                handleUnlockSuccess('Biometric authentication successful')
            } else {
                setError('Biometric authentication failed')
                // Check lockout status after failed attempt
                checkLockoutStatus()
            }
        } catch (error: any) {
            // Handle lockout error specifically
            if (error.message && error.message.includes('Too many failed attempts')) {
                setError(error.message)
                checkLockoutStatus()
            } else {
                setError('Biometric authentication failed')
                console.error('Biometric unlock error:', error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleBiometricSetup = async () => {
        if (!biometricSupported) {
            showToast({
                type: 'error',
                title: 'Biometric Setup Failed',
                message: 'Biometric authentication is not supported on this device'
            })
            return
        }

        // We need the password to associate with the biometric credential
        if (activeWallet?.isEncrypted && !password) {
            setError('Please enter your wallet password first to enable biometric authentication')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            // First verify the password is correct before setting up biometrics
            if (activeWallet?.isEncrypted) {
                // Try validating the password first
                const passwordValid = await securityService.unlockWallet(password, false)
                if (!passwordValid) {
                    setError('Invalid password. Please enter the correct password before setting up biometrics.')
                    setIsLoading(false)
                    return
                }
            }

            // Setup biometric authentication with the wallet's password
            // After validating password, set up biometrics and store the wallet password
            const walletId = activeWallet ? activeWallet.address : undefined;
            const success = await securityService.setupBiometricAuth(walletId)

            // If successful and we have a password, store it securely
            if (success && activeWallet?.isEncrypted && password) {
                // Get the credential to use as encryption key
                const credential = await StorageService.getBiometricCredential();
                if (credential && activeWallet) {
                    const secureKey = credential.join('-');
                    await StorageService.setEncryptedWalletPassword(secureKey, password, activeWallet.address);
                }
            }
            if (success) {
                // Enable biometric authentication
                await StorageService.setBiometricEnabled(true)

                // Update our state
                setBiometricSetup(true)
                setBiometricAvailable(true)

                // Get the biometric type for the success message
                const biometricTypeDisplay = getBiometricTypeDisplay()

                showToast({
                    type: 'success',
                    title: 'Biometric Setup Complete',
                    message: `${biometricTypeDisplay} authentication is now enabled for your wallet`
                })

                // Clear password field for security
                setPassword('')

                // Log the security event
                await securityService.logSecurityEvent('biometric_setup', 'Biometric authentication enabled by user', true)
            } else {
                setError('Failed to set up biometric authentication. Please try again.')
                showToast({
                    type: 'error',
                    title: 'Biometric Setup Failed',
                    message: 'Unable to set up biometric authentication. Please ensure your device supports it and try again.'
                })
            }
        } catch (error: any) {
            console.error('Biometric setup error:', error)

            let errorMessage = 'Failed to set up biometric authentication'

            // Handle specific WebAuthn errors
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Biometric setup was cancelled or denied'
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Biometric authentication is not supported on this device'
            } else if (error.name === 'InvalidStateError') {
                errorMessage = 'Biometric authentication is not available. Please check your device settings.'
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Security error occurred during biometric setup'
            } else if (error.message) {
                errorMessage = error.message
            }

            setError(errorMessage)
            showToast({
                type: 'error',
                title: 'Biometric Setup Failed',
                message: errorMessage
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleBiometricDisable = async () => {
        if (!biometricSetup || !activeWallet) {
            return // Nothing to disable
        }

        setIsLoading(true)
        setError('')

        try {
            // Only disable for the current wallet
            const success = await securityService.disableBiometricAuth(activeWallet.address)
            if (success) {
                // Update our state
                setBiometricSetup(false)
                setBiometricAvailable(false)

                // Get the biometric type for the success message
                const biometricTypeDisplay = getBiometricTypeDisplay()

                showToast({
                    type: 'success',
                    title: 'Biometrics Disabled',
                    message: `${biometricTypeDisplay} authentication has been disabled for wallet "${activeWallet.name}"`
                })
            } else {
                setError('Failed to disable biometric authentication')
                showToast({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to disable biometric authentication'
                })
            }
        } catch (error: any) {
            console.error('Biometric disable error:', error)
            setError('Failed to disable biometric authentication')
            showToast({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to disable biometric authentication'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const getBiometricTypeDisplay = (): string => {
        if (biometricTypes.length === 0) return 'Biometric'

        // Prioritize face recognition over fingerprint for display
        if (biometricTypes.includes('face')) return 'Face ID'
        if (biometricTypes.includes('fingerprint')) return 'Fingerprint'
        return 'Biometric'
    }

    const getBiometricIcon = () => {
        if (biometricTypes.includes('face')) {
            return <ScanFace className="w-5 h-5 mr-2" />
        }
        return <Fingerprint className="w-5 h-5 mr-2" />
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
        <GradientBackground variant="auto" className="fixed inset-0 flex items-center justify-center z-50">
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4">
                {/* Theme Toggle Button */}
                <div className="absolute top-4 right-4">
                    <ThemeSwitcher />
                </div>

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

                {/* Biometric Authentication - Available and Set Up */}
                {biometricAvailable && (
                    <div className="mb-6">
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleBiometricUnlock}
                                disabled={isLoading || isLockedOut}
                                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                            >
                                {getBiometricIcon()}
                                {isLoading ? 'Authenticating...' :
                                    isLockedOut ? `Locked (${Math.ceil(lockoutTimeRemaining / 1000)}s)` :
                                        `Unlock with ${getBiometricTypeDisplay()}`}
                            </button>

                            <button
                                onClick={handleBiometricDisable}
                                disabled={isLoading}
                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center justify-center transition-colors"
                            >
                                <span>Disable {getBiometricTypeDisplay()} authentication</span>
                            </button>
                        </div>

                        <div className="flex items-center my-4">
                            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="px-3 text-sm text-gray-500 dark:text-gray-400">OR</span>
                            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                    </div>
                )}

                {/* Biometric Setup - Supported but Not Set Up */}
                {biometricSupported && !biometricSetup && (
                    <div className="mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-4">
                            <div className="flex items-center mb-2">
                                {getBiometricIcon()}
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {getBiometricTypeDisplay()} Available
                                </span>
                            </div>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Enable {getBiometricTypeDisplay().toLowerCase()} authentication for faster and more secure wallet access.
                            </p>
                        </div>

                        <button
                            onClick={handleBiometricSetup}
                            disabled={isLoading || isLockedOut}
                            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            {getBiometricIcon()}
                            {isLoading ? 'Setting up...' : `Set up ${getBiometricTypeDisplay()}`}
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
                                    onKeyDown={(e) => e.key === 'Enter' && !isLockedOut && handlePasswordUnlock()}
                                    placeholder="Enter your wallet password"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-12"
                                    disabled={isLoading || isLockedOut}
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
                            disabled={isLoading || isLockedOut || (activeWallet?.isEncrypted && !password)}
                            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                            <Lock className="w-5 h-5 mr-2" />
                            {isLoading ? 'Unlocking...' :
                                isLockedOut ? `Locked (${Math.ceil(lockoutTimeRemaining / 1000)}s)` :
                                    'Unlock Wallet'}
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
                            disabled={isLoading || isLockedOut}
                            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                            <Lock className="w-5 h-5 mr-2" />
                            {isLoading ? 'Unlocking...' :
                                isLockedOut ? `Locked (${Math.ceil(lockoutTimeRemaining / 1000)}s)` :
                                    'Unlock Wallet'}
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
        </GradientBackground>
    )
}
