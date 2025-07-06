'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { securityService } from '@/services/SecurityService'
import SecurityLockScreen from '@/components/SecurityLockScreen'

interface SecurityContextType {
    isLocked: boolean
    lockWallet: () => Promise<void>
    unlockWallet: (password?: string, useBiometric?: boolean) => Promise<boolean>
    requireAuth: () => Promise<boolean>
    manualLock: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

interface SecurityProviderProps {
    children: ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
    const [isLocked, setIsLocked] = useState(false)
    const [lockReason, setLockReason] = useState<'timeout' | 'manual' | 'failed_auth'>('manual')

    useEffect(() => {
        // Initialize security service and check if wallet should be locked
        const initSecurity = async () => {
            try {
                const isCurrentlyLocked = securityService.isLocked()
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
        const success = await securityService.unlockWallet(password, useBiometric)
        if (success) {
            setIsLocked(false)
        }
        return success
    }

    const requireAuth = async (): Promise<boolean> => {
        if (isLocked) {
            return false
        }

        try {
            const settings = await securityService.getSecuritySettings()
            if (settings.biometric.requireForTransactions || settings.biometric.requireForExports) {
                // For sensitive actions, always require re-authentication
                return new Promise((resolve) => {
                    // This would show an authentication dialog
                    // For now, just return true if wallet is unlocked
                    resolve(true)
                })
            }

            return true
        } catch (error) {
            console.error('Failed to check authentication requirements:', error)
            // Default to allowing the action if settings can't be loaded
            return true
        }
    }

    const manualLock = async () => {
        await securityService.lockWallet('manual')
        setIsLocked(true)
        setLockReason('manual')
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
            manualLock
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
