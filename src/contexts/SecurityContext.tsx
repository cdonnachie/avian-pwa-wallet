'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { securityService } from '@/services/SecurityService'
import SecurityLockScreen from '@/components/SecurityLockScreen'

interface SecurityContextType {
    isLocked: boolean
    lockWallet: () => Promise<void>
    unlockWallet: (password?: string, useBiometric?: boolean) => Promise<boolean>
    requireAuth: () => Promise<{ success: boolean; password?: string }>
    manualLock: () => Promise<void>
    wasBiometricAuth: boolean
    storedWalletPassword?: string
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

interface SecurityProviderProps {
    children: ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
    const [isLocked, setIsLocked] = useState(false)
    const [lockReason, setLockReason] = useState<'timeout' | 'manual' | 'failed_auth'>('manual')
    const [wasBiometricAuth, setWasBiometricAuth] = useState(false)
    const [storedWalletPassword, setStoredWalletPassword] = useState<string | undefined>()

    useEffect(() => {
        // Initialize security service and check if wallet should be locked
        const initSecurity = async () => {
            try {
                const isCurrentlyLocked = await securityService.isLocked()
                setIsLocked(isCurrentlyLocked)
            } catch (error) {
                console.error('Failed to initialize security context:', error)
                // Default to unlocked state if there's an error
                setIsLocked(false)
            }
        }

        initSecurity()

        // Listen for lock state changes
        const unsubscribe = securityService.onLockStateChange((locked: boolean, reason?: 'timeout' | 'manual' | 'failed_auth') => {
            setIsLocked(locked)
            if (reason) {
                setLockReason(reason)
            }
        })

        return () => {
            unsubscribe()
        }
    }, [])

    const lockWallet = async () => {
        await securityService.lockWallet()
        setIsLocked(true)
        setLockReason('manual')
    }

    const unlockWallet = async (password?: string, useBiometric?: boolean) => {
        console.log('Attempting to unlock wallet with password:', password, 'and useBiometric:', useBiometric)
        if (useBiometric) {
            // Get the biometric authentication result directly to access the wallet password
            const biometricAvailable = await securityService.isBiometricAuthAvailable()
            console.log('Biometric available:', biometricAvailable)
            if (biometricAvailable) {
                const biometricResult = await securityService.authenticateWithBiometric()
                console.log('Biometric authentication result:', biometricResult)
                if (biometricResult.success) {
                    console.log('Biometric authentication successful:', biometricResult)
                    console.log('Storing wallet password from biometric auth:', biometricResult.walletPassword)
                    console.log('Setting wasBiometricAuth to true')
                    setWasBiometricAuth(true)
                    setStoredWalletPassword(biometricResult.walletPassword)
                    setIsLocked(false)
                    return true
                }
                return false
            }
            return false
        } else {
            const success = await securityService.unlockWallet(password, false)
            console.log('Unlocking wallet with password:', password)
            if (success) {
                setIsLocked(false)
                setWasBiometricAuth(false)
                // Store the password if provided
                if (password) {
                    setStoredWalletPassword(password)
                } else {
                    setStoredWalletPassword(undefined)
                }
            }
            return success
        }
    }

    const requireAuth = async (): Promise<{ success: boolean; password?: string }> => {
        if (isLocked) {
            return { success: false }
        }

        try {
            const settings = await securityService.getSecuritySettings()

            // Check for biometric requirements for transactions or exports
            if (settings.biometric.requireForTransactions || settings.biometric.requireForExports) {
                // For sensitive actions, always require biometric authentication if enabled
                if (settings.biometric.enabled) {
                    const biometricAvailable = await securityService.isBiometricAuthAvailable()
                    if (biometricAvailable) {
                        // Always attempt biometric authentication for transactions
                        const biometricResult = await securityService.authenticateWithBiometric()

                        // Update stored credentials when successful
                        if (biometricResult.success && biometricResult.walletPassword) {
                            setWasBiometricAuth(true)
                            setStoredWalletPassword(biometricResult.walletPassword)
                        }

                        return {
                            success: biometricResult.success,
                            password: biometricResult.walletPassword
                        }
                    } else {
                        console.warn('Biometrics required but not available')
                        // Fallback to password or other auth method could be implemented here
                        return { success: false }
                    }
                } else {
                    console.warn('Biometrics required in settings but not enabled')
                    return { success: false }
                }
            }

            // If password is already stored from previous authentication
            if (storedWalletPassword) {
                return {
                    success: true,
                    password: storedWalletPassword
                }
            }

            return { success: true }
        } catch (error) {
            console.error('Failed to check authentication requirements:', error)
            // Default to requiring explicit authentication if settings can't be loaded
            return { success: false }
        }
    }

    const manualLock = async () => {
        await securityService.lockWallet('manual')
        setIsLocked(true)
        setLockReason('manual')
        setWasBiometricAuth(false)
        setStoredWalletPassword(undefined)
    }

    const handleUnlock = () => {
        setIsLocked(false)
    }

    if (isLocked) {
        return <SecurityLockScreen onUnlock={handleUnlock} lockReason={lockReason} />
    }

    return (
        <SecurityContext.Provider value={{
            isLocked,
            lockWallet,
            unlockWallet,
            requireAuth,
            manualLock,
            wasBiometricAuth,
            storedWalletPassword
        }}>
            {children}
        </SecurityContext.Provider>
    )
}

export function useSecurity() {
    const context = useContext(SecurityContext)
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider')
    }
    return context
}
