'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Fingerprint, Clock, FileText, Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { securityService } from '@/services/SecurityService'
import { SecuritySettings, SecurityAuditEntry } from '@/types/security'
import { useToast } from '@/components/Toast'

export default function SecuritySettingsPanel() {
    const [settings, setSettings] = useState<SecuritySettings | null>(null)
    const [auditLog, setAuditLog] = useState<SecurityAuditEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [biometricSupported, setBiometricSupported] = useState(false)
    const [activeTab, setActiveTab] = useState<'settings' | 'audit'>('settings')
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const { showToast } = useToast()

    useEffect(() => {
        // Store ref for cleanup
        const timeoutRef = updateTimeoutRef

        const loadSettings = async () => {
            try {
                const securitySettings = await securityService.getSecuritySettings()
                setSettings(securitySettings)
            } catch (error) {
                showToast({
                    type: 'error',
                    title: 'Error loading settings',
                    message: 'Failed to load security settings'
                })
            } finally {
                setIsLoading(false)
            }
        }

        const checkBiometricSupport = async () => {
            const capabilities = await securityService.getBiometricCapabilities()
            setBiometricSupported(capabilities.isSupported)
        }

        const init = async () => {
            await loadSettings()
            await loadAuditLog()
            await checkBiometricSupport()
        }
        init()

        // Cleanup timeout on unmount
        return () => {
            const currentTimeout = timeoutRef.current
            if (currentTimeout) {
                clearTimeout(currentTimeout)
            }
        }
    }, [showToast])

    const loadSettings = async () => {
        try {
            const securitySettings = await securityService.getSecuritySettings()
            setSettings(securitySettings)
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Error loading settings',
                message: 'Failed to load security settings'
            })
        }
    }

    const loadAuditLog = async () => {
        try {
            const log = await securityService.getSecurityAuditLog()
            setAuditLog(log.slice(-50)) // Show last 50 entries
        } catch (error) {
            console.error('Failed to load audit log:', error)
        }
    }

    const handleSettingsUpdate = async (newSettings: Partial<SecuritySettings>) => {
        if (!settings) return

        // Update local state immediately for responsive UI
        const updatedSettings = { ...settings, ...newSettings }
        setSettings(updatedSettings)

        // Check if biometric settings have changed
        const biometricSettingsChanged = newSettings.biometric !== undefined;

        // Clear existing timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current)
        }

        // Set new timeout for actual save
        const timeout = setTimeout(async () => {
            setIsSaving(true)
            try {
                await securityService.updateSecuritySettings(newSettings)

                // If biometric settings changed, dispatch an event to notify other components
                if (biometricSettingsChanged) {
                    const event = new CustomEvent('security-settings-changed', {
                        detail: { biometric: updatedSettings.biometric }
                    });
                    window.dispatchEvent(event);
                }

                showToast({
                    type: 'success',
                    title: 'Settings updated',
                    message: 'Security settings have been saved'
                })
            } catch (error) {
                showToast({
                    type: 'error',
                    title: 'Update failed',
                    message: 'Failed to update security settings'
                })
                // Revert local changes on error
                await loadSettings()
            } finally {
                setIsSaving(false)
            }
        }, 1000) // 1 second delay

        updateTimeoutRef.current = timeout
    }

    const formatTimeoutDisplay = (ms: number) => {
        const minutes = Math.floor(ms / 60000)
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`
        }
        const hours = Math.floor(minutes / 60)
        return `${hours} hour${hours !== 1 ? 's' : ''}`
    }

    const formatAuditLogTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString()
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'wallet_unlock':
            case 'wallet_lock':
                return <Shield className="w-4 h-4" />
            case 'biometric_auth':
                return <Fingerprint className="w-4 h-4" />
            case 'transaction_sign':
                return <CheckCircle className="w-4 h-4" />
            default:
                return <FileText className="w-4 h-4" />
        }
    }

    const clearAuditLog = async () => {
        if (confirm('Are you sure you want to clear the security audit log? This action cannot be undone.')) {
            try {
                await securityService.clearSecurityAuditLog()
                setAuditLog([])
                showToast({
                    type: 'success',
                    title: 'Audit log cleared',
                    message: 'Security audit log has been cleared'
                })
            } catch (error) {
                showToast({
                    type: 'error',
                    title: 'Clear failed',
                    message: 'Failed to clear audit log'
                })
            }
        }
    }

    if (isLoading || !settings) {
        return (
            <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading security settings...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Shield className="w-6 h-6 mr-3 text-blue-600" />
                        Security Settings
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Configure security features to protect your wallet
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Shield className="w-4 h-4 inline mr-2" />
                        Security Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'audit'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Audit Log ({auditLog.length})
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'settings' ? (
                        <div className="space-y-8">
                            {/* Auto-lock Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Clock className="w-5 h-5 mr-2 text-amber-600" />
                                    Auto-lock Settings
                                </h3>

                                <div className="space-y-4 ml-7">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.autoLock.enabled}
                                            onChange={(e) => handleSettingsUpdate({
                                                autoLock: { ...settings.autoLock, enabled: e.target.checked }
                                            })}
                                            className="mr-3"
                                        />
                                        <span className="text-gray-900 dark:text-white">Enable auto-lock</span>
                                    </label>

                                    {settings.autoLock.enabled && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Lock timeout: {formatTimeoutDisplay(settings.autoLock.timeout)}
                                                </label>
                                                <input
                                                    type="range"
                                                    min="60000" // 1 minute
                                                    max="3600000" // 1 hour
                                                    step="60000" // 1 minute steps
                                                    value={settings.autoLock.timeout}
                                                    onChange={(e) => handleSettingsUpdate({
                                                        autoLock: { ...settings.autoLock, timeout: parseInt(e.target.value) }
                                                    })}
                                                    className="w-full"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>1 min</span>
                                                    <span>1 hour</span>
                                                </div>
                                            </div>

                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.autoLock.requirePasswordAfterTimeout}
                                                    onChange={(e) => handleSettingsUpdate({
                                                        autoLock: { ...settings.autoLock, requirePasswordAfterTimeout: e.target.checked }
                                                    })}
                                                    className="mr-3"
                                                />
                                                <span className="text-gray-900 dark:text-white">Require password after timeout</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Biometric Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <Fingerprint className="w-5 h-5 mr-2 text-green-600" />
                                    Biometric Authentication
                                </h3>

                                {biometricSupported ? (
                                    <div className="space-y-4 ml-7">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={settings.biometric.enabled}
                                                onChange={(e) => handleSettingsUpdate({
                                                    biometric: { ...settings.biometric, enabled: e.target.checked }
                                                })}
                                                className="mr-3"
                                            />
                                            <span className="text-gray-900 dark:text-white">Enable biometric authentication</span>
                                        </label>

                                        {settings.biometric.enabled && (
                                            <>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.biometric.requireForTransactions}
                                                        onChange={(e) => handleSettingsUpdate({
                                                            biometric: { ...settings.biometric, requireForTransactions: e.target.checked }
                                                        })}
                                                        className="mr-3"
                                                    />
                                                    <span className="text-gray-900 dark:text-white">Require for transactions</span>
                                                </label>

                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings.biometric.requireForExports}
                                                        onChange={(e) => handleSettingsUpdate({
                                                            biometric: { ...settings.biometric, requireForExports: e.target.checked }
                                                        })}
                                                        className="mr-3"
                                                    />
                                                    <span className="text-gray-900 dark:text-white">Require for private key/mnemonic exports</span>
                                                </label>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="ml-7 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                                        <p className="text-amber-800 dark:text-amber-200 text-sm">
                                            Biometric authentication is not supported on this device or browser.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Audit Log Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <FileText className="w-5 h-5 mr-2 text-red-600" />
                                    Security Audit Log
                                </h3>

                                <div className="space-y-4 ml-7">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.auditLog.enabled}
                                            onChange={(e) => handleSettingsUpdate({
                                                auditLog: { ...settings.auditLog, enabled: e.target.checked }
                                            })}
                                            className="mr-3"
                                        />
                                        <span className="text-gray-900 dark:text-white">Enable security audit logging</span>
                                    </label>

                                    {settings.auditLog.enabled && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Retention period: {settings.auditLog.retentionDays} days
                                                </label>
                                                <input
                                                    type="range"
                                                    min="7"
                                                    max="365"
                                                    step="1"
                                                    value={settings.auditLog.retentionDays}
                                                    onChange={(e) => handleSettingsUpdate({
                                                        auditLog: { ...settings.auditLog, retentionDays: parseInt(e.target.value) }
                                                    })}
                                                    className="w-full"
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>7 days</span>
                                                    <span>1 year</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Audit Log Tab */
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Security Audit Log
                                </h3>
                                <button
                                    onClick={clearAuditLog}
                                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Clear Log
                                </button>
                            </div>

                            {auditLog.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No audit log entries found
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {auditLog.reverse().map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={`p-3 rounded-lg border ${entry.success
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start">
                                                    <div className="mr-3 mt-0.5">
                                                        {getActionIcon(entry.action)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center">
                                                            <span className="font-medium text-gray-900 dark:text-white mr-2">
                                                                {entry.action.replace(/_/g, ' ')}
                                                            </span>
                                                            {entry.success ? (
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                            ) : (
                                                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            {entry.details}
                                                        </p>
                                                        {entry.walletAddress && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                                                                Wallet: {entry.walletAddress.slice(0, 10)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap ml-4">
                                                    {formatAuditLogTime(entry.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Save Indicator */}
            {isSaving && (
                <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                    Saving settings...
                </div>
            )}
        </div>
    )
}
