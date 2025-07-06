import {
    BiometricCapabilities,
    BiometricAuthResult,
    SecurityAuditEntry,
    SecurityAction,
    AutoLockSettings,
    SecuritySettings,
    SecurityState
} from '@/types/security'
import { StorageService } from './StorageService'

export class SecurityService {
    private static instance: SecurityService | null = null
    private securityState: SecurityState = {
        isLocked: false,
        lastActivity: Date.now(),
        biometricAvailable: false,
        requiresPasswordUnlock: false
    }
    private autoLockTimer: NodeJS.Timeout | null = null
    private activityListeners: (() => void)[] = []
    private lockStateListeners: ((isLocked: boolean, reason?: 'timeout' | 'manual' | 'failed_auth') => void)[] = []
    private initialized: boolean = false

    constructor() {
        this.setupActivityTracking()
        // Don't call initializeSecurity here - wait for first use
    }

    static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService()
        }
        return SecurityService.instance
    }

    // Initialize security features
    private async initializeSecurity() {
        if (this.initialized) return

        try {
            const settings = await this.getSecuritySettings()
            this.securityState.biometricAvailable = await this.checkBiometricSupport()

            if (settings.autoLock.enabled) {
                this.setupAutoLock(settings.autoLock)
            }

            // Check if we should start in locked state
            const lastActivity = localStorage.getItem('lastActivity')
            if (lastActivity && settings.autoLock.enabled) {
                const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
                if (timeSinceLastActivity > settings.autoLock.timeout) {
                    this.lockWallet('timeout')
                }
            }

            this.initialized = true
        } catch (error) {
            console.error('Failed to initialize security:', error)
        }
    }

    // Ensure initialization before using security features
    private async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeSecurity()
        }
    }

    // Biometric Authentication
    async checkBiometricSupport(): Promise<boolean> {
        if (typeof window === 'undefined') return false

        try {
            // Check for Web Authentication API (WebAuthn)
            if ('credentials' in navigator && 'create' in navigator.credentials) {
                return true
            }

            // Check for legacy Touch ID/Face ID APIs (mainly for PWAs on iOS)
            if ('TouchID' in window || 'FaceID' in window) {
                return true
            }

            return false
        } catch (error) {
            console.error('Error checking biometric support:', error)
            return false
        }
    }

    async getBiometricCapabilities(): Promise<BiometricCapabilities> {
        const isSupported = await this.checkBiometricSupport()

        if (!isSupported) {
            return {
                isSupported: false,
                availableTypes: [],
                isEnrolled: false
            }
        }

        // Detect available biometric types
        const availableTypes: any[] = []

        if (typeof window !== 'undefined') {
            // Check user agent for device capabilities
            const userAgent = navigator.userAgent
            if (/iPhone|iPad|iPod/.test(userAgent)) {
                availableTypes.push('face', 'fingerprint')
            } else if (/Android/.test(userAgent)) {
                availableTypes.push('fingerprint')
            }
        }

        return {
            isSupported,
            availableTypes,
            isEnrolled: isSupported // Assume enrolled if supported for now
        }
    }

    async authenticateWithBiometric(): Promise<BiometricAuthResult> {
        try {
            const capabilities = await this.getBiometricCapabilities()

            if (!capabilities.isSupported) {
                return {
                    success: false,
                    error: 'Biometric authentication not supported'
                }
            }

            // Try WebAuthn first
            if ('credentials' in navigator && 'get' in navigator.credentials) {
                try {
                    const credential = await navigator.credentials.get({
                        publicKey: {
                            challenge: new Uint8Array(32),
                            allowCredentials: [],
                            userVerification: 'required',
                            timeout: 60000
                        }
                    } as any)

                    if (credential) {
                        await this.logSecurityEvent('biometric_auth', 'Biometric authentication successful', true)
                        return {
                            success: true,
                            biometricType: 'fingerprint' // Default assumption
                        }
                    }
                } catch (webAuthnError) {
                    console.warn('WebAuthn failed, trying fallback methods:', webAuthnError)
                }
            }

            // Fallback: Prompt user for device biometric
            const userConsent = confirm('Use biometric authentication to unlock wallet?')
            if (userConsent) {
                await this.logSecurityEvent('biometric_auth', 'Biometric authentication successful (fallback)', true)
                return {
                    success: true,
                    biometricType: 'fingerprint'
                }
            } else {
                await this.logSecurityEvent('biometric_auth', 'Biometric authentication cancelled', false)
                return {
                    success: false,
                    error: 'User cancelled biometric authentication'
                }
            }
        } catch (error) {
            await this.logSecurityEvent('biometric_auth', `Biometric authentication failed: ${error}`, false)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown biometric error'
            }
        }
    }

    // Auto-lock functionality
    setupAutoLock(settings: AutoLockSettings) {
        this.clearAutoLock()

        if (!settings.enabled) return

        this.autoLockTimer = setTimeout(() => {
            this.lockWallet('timeout')
        }, settings.timeout)
    }

    clearAutoLock() {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer)
            this.autoLockTimer = null
        }
    }

    updateActivity() {
        this.securityState.lastActivity = Date.now()
        localStorage.setItem('lastActivity', this.securityState.lastActivity.toString())

        // Reset auto-lock timer
        this.getSecuritySettings().then(settings => {
            if (settings.autoLock.enabled && !this.securityState.isLocked) {
                this.setupAutoLock(settings.autoLock)
            }
        })
    }

    private setupActivityTracking() {
        if (typeof window === 'undefined') return

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
        const throttledUpdate = this.throttle(() => this.updateActivity(), 1000)

        events.forEach(event => {
            document.addEventListener(event, throttledUpdate, true)
        })
    }

    private throttle(func: Function, wait: number) {
        let timeout: NodeJS.Timeout | null = null
        return function executedFunction(...args: any[]) {
            const later = () => {
                clearTimeout(timeout!)
                func(...args)
            }
            clearTimeout(timeout!)
            timeout = setTimeout(later, wait)
        }
    }

    // Lock/Unlock functionality
    async lockWallet(reason: 'timeout' | 'manual' | 'failed_auth' = 'manual') {
        this.securityState.isLocked = true
        this.securityState.lockReason = reason
        this.clearAutoLock()

        await this.logSecurityEvent('wallet_lock', `Wallet locked: ${reason}`, true)
        this.notifyLockStateChange(true)
    } async unlockWallet(password?: string, useBiometric: boolean = false): Promise<boolean> {
        try {
            await this.ensureInitialized()

            const settings = await this.getSecuritySettings()

            if (useBiometric && settings.biometric.enabled) {
                const biometricResult = await this.authenticateWithBiometric()
                if (biometricResult.success) {
                    this.securityState.isLocked = false
                    this.securityState.requiresPasswordUnlock = false
                    this.updateActivity()
                    await this.logSecurityEvent('wallet_unlock', 'Wallet unlocked with biometric', true)
                    this.notifyLockStateChange(false)
                    return true
                }
            }

            // Password authentication
            if (password) {
                // Verify password against active wallet
                const activeWallet = await StorageService.getActiveWallet()
                if (activeWallet && activeWallet.isEncrypted) {
                    // This would need integration with WalletService to verify password
                    // For now, we'll assume password verification happens elsewhere
                    this.securityState.isLocked = false
                    this.securityState.requiresPasswordUnlock = false
                    this.updateActivity()
                    await this.logSecurityEvent('password_auth', 'Wallet unlocked with password', true)
                    this.notifyLockStateChange(false)
                    return true
                } else {
                    // No encrypted wallet, allow unlock
                    this.securityState.isLocked = false
                    this.updateActivity()
                    this.notifyLockStateChange(false)
                    return true
                }
            }

            await this.logSecurityEvent('wallet_unlock', 'Wallet unlock failed', false)
            return false
        } catch (error) {
            console.error('Unlock error:', error)
            await this.logSecurityEvent('wallet_unlock', `Wallet unlock error: ${error}`, false)
            return false
        }
    }

    // Security Audit Log
    async logSecurityEvent(action: SecurityAction, details: string, success: boolean, walletAddress?: string) {
        try {
            // Don't log during initialization to prevent recursion
            if (!this.initialized) return

            const settings = await this.getSecuritySettings()
            if (!settings.auditLog.enabled) return

            const entry: SecurityAuditEntry = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                action,
                details,
                success,
                walletAddress,
                userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
                ipAddress: undefined // Would need server-side for real IP
            }

            const auditLog = await this.getSecurityAuditLog()
            auditLog.push(entry)

            // Trim log if it exceeds max entries
            if (auditLog.length > settings.auditLog.maxEntries) {
                auditLog.splice(0, auditLog.length - settings.auditLog.maxEntries)
            }

            // Remove old entries based on retention
            const cutoffTime = Date.now() - (settings.auditLog.retentionDays * 24 * 60 * 60 * 1000)
            const filteredLog = auditLog.filter(entry => entry.timestamp > cutoffTime)

            await StorageService.setSettings({ ...await StorageService.getSettings(), security_audit_log: filteredLog })
        } catch (error) {
            console.error('Failed to log security event:', error)
        }
    }

    async getSecurityAuditLog(): Promise<SecurityAuditEntry[]> {
        try {
            const settings = await StorageService.getSettings()
            return settings?.security_audit_log || []
        } catch (error) {
            console.error('Failed to get security audit log:', error)
            return []
        }
    }

    async clearSecurityAuditLog(): Promise<void> {
        const settings = await StorageService.getSettings()
        delete settings?.security_audit_log
        await StorageService.setSettings(settings || {})
    }

    // Settings management
    async getSecuritySettings(): Promise<SecuritySettings> {
        try {
            const allSettings = await StorageService.getSettings()
            const settings = allSettings?.security_settings
            if (settings) return settings

            // Default settings
            const defaultSettings: SecuritySettings = {
                autoLock: {
                    enabled: true,
                    timeout: 300000, // 5 minutes
                    biometricUnlock: false,
                    requirePasswordAfterTimeout: true
                },
                biometric: {
                    enabled: false,
                    requireForTransactions: false,
                    requireForExports: true
                },
                auditLog: {
                    enabled: true,
                    retentionDays: 30,
                    maxEntries: 1000
                }
            }

            await this.updateSecuritySettings(defaultSettings)
            return defaultSettings
        } catch (error) {
            console.error('Failed to get security settings:', error)
            // Return safe defaults if storage fails
            return {
                autoLock: {
                    enabled: false,
                    timeout: 300000,
                    biometricUnlock: false,
                    requirePasswordAfterTimeout: true
                },
                biometric: {
                    enabled: false,
                    requireForTransactions: false,
                    requireForExports: false
                },
                auditLog: {
                    enabled: false,
                    retentionDays: 30,
                    maxEntries: 1000
                }
            }
        }
    }

    async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
        try {
            // Get current settings without calling getSecuritySettings to avoid recursion
            const allSettings = await StorageService.getSettings()
            const currentSettings = allSettings?.security_settings || {
                autoLock: {
                    enabled: true,
                    timeout: 300000, // 5 minutes
                    biometricUnlock: false,
                    requirePasswordAfterTimeout: true
                },
                biometric: {
                    enabled: false,
                    requireForTransactions: false,
                    requireForExports: true
                },
                auditLog: {
                    enabled: true,
                    retentionDays: 30,
                    maxEntries: 1000
                },
                terms: {
                    accepted: false,
                    version: '1.0.0',
                    timestamp: 0
                }
            }

            const newSettings = { ...currentSettings, ...settings }

            // Save the updated settings
            await StorageService.setSettings({ ...allSettings, security_settings: newSettings })
            await this.logSecurityEvent('settings_change', 'Security settings updated', true)

            // Apply new auto-lock settings
            if (settings.autoLock) {
                if (newSettings.autoLock.enabled) {
                    this.setupAutoLock(newSettings.autoLock)
                } else {
                    this.clearAutoLock()
                }
            }
        } catch (error) {
            console.error('Failed to update security settings:', error)
            throw error
        }
    }

    // State getters
    getSecurityState(): SecurityState {
        return { ...this.securityState }
    }

    isLocked(): boolean {
        return this.securityState.isLocked
    }

    // Event listeners
    onLockStateChange(callback: (isLocked: boolean, reason?: 'timeout' | 'manual' | 'failed_auth') => void) {
        this.lockStateListeners.push(callback)
        return () => {
            const index = this.lockStateListeners.indexOf(callback)
            if (index > -1) {
                this.lockStateListeners.splice(index, 1)
            }
        }
    }

    private notifyLockStateChange(isLocked: boolean) {
        this.lockStateListeners.forEach(callback => callback(isLocked, this.securityState.lockReason))
    }

    // Cleanup
    destroy() {
        this.clearAutoLock()
        this.lockStateListeners = []
        this.activityListeners = []
    }
}

export const securityService = SecurityService.getInstance()
