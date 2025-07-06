'use client'

import { useState } from 'react'
import { X, Download, Upload, FileText, Database, Settings as SettingsIcon, Lock, Unlock, CheckCircle, AlertCircle } from 'lucide-react'
import { BackupService } from '@/services/BackupService'
import { WalletBackup, RestoreOptions } from '@/types/backup'

interface BackupModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (message: string) => void
    onError: (message: string) => void
}

export default function BackupModal({ isOpen, onClose, onSuccess, onError }: BackupModalProps) {
    const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup')
    const [backupType, setBackupType] = useState<'full' | 'wallets'>('full')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [useEncryption, setUseEncryption] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [backupSummary, setBackupSummary] = useState<any>(null)

    // Restore state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [restorePassword, setRestorePassword] = useState('')
    const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
        includeWallets: true,
        includeAddressBook: true,
        includeSettings: true,
        overwriteExisting: false
    })
    const [backupPreview, setBackupPreview] = useState<WalletBackup | null>(null)

    if (!isOpen) return null

    const resetForm = () => {
        setPassword('')
        setConfirmPassword('')
        setRestorePassword('')
        setSelectedFile(null)
        setBackupPreview(null)
        setBackupSummary(null)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleCreateBackup = async () => {
        if (useEncryption && (!password || password !== confirmPassword)) {
            onError('Passwords do not match')
            return
        }

        try {
            setIsLoading(true)

            let backup: WalletBackup
            if (backupType === 'full') {
                backup = await BackupService.createFullBackup(useEncryption ? password : undefined)
            } else {
                backup = await BackupService.createWalletsOnlyBackup(useEncryption ? password : undefined)
            }

            // Get backup summary for user
            const summary = BackupService.getBackupSummary(backup)
            setBackupSummary(summary)

            // Export and download the backup file
            const exportedBackup = await BackupService.exportBackup(backup, useEncryption ? password : undefined)
            const filename = `avian-wallet-backup-${backupType}-${new Date().toISOString().split('T')[0]}.json`
            BackupService.downloadBackup(exportedBackup, filename)

            onSuccess(`${backupType === 'full' ? 'Full' : 'Wallets-only'} backup created and downloaded successfully!`)

        } catch (error: any) {
            onError(error.message || 'Failed to create backup')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedFile(file)

        try {
            setIsLoading(true)

            // First, try to parse without password to check if it's encrypted
            const result = await BackupService.parseBackupFile(file)

            // Validate the backup
            if (!result.validation.isValid) {
                onError(`Invalid backup file: ${result.validation.errors.join(', ')}`)
                setSelectedFile(null)
                return
            }

            setBackupPreview(result.backup)

        } catch (error: any) {
            // If parsing fails, it might be encrypted - we'll need password input
            if (error.message.includes('encrypted') || error.message.includes('password') || error.message.includes('decrypt')) {
                // File is encrypted, show password field
                setBackupPreview(null)
            } else {
                onError(error.message || 'Failed to read backup file')
                setSelectedFile(null)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasswordVerify = async () => {
        if (!selectedFile || !restorePassword) return

        try {
            setIsLoading(true)
            const result = await BackupService.parseBackupFile(selectedFile, restorePassword)

            if (!result.validation.isValid) {
                onError(`Invalid backup file: ${result.validation.errors.join(', ')}`)
                return
            }

            setBackupPreview(result.backup)

        } catch (error: any) {
            onError(error.message || 'Failed to decrypt backup file')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRestore = async () => {
        if (!selectedFile || !backupPreview) {
            onError('Please select a valid backup file')
            return
        }

        try {
            setIsLoading(true)

            await BackupService.restoreFromBackup(
                backupPreview,
                restoreOptions
            )

            onSuccess(`Backup restored successfully!`)

            // Suggest page reload
            if (confirm('Backup restored successfully! Would you like to reload the page to see the changes?')) {
                window.location.reload()
            }

        } catch (error: any) {
            onError(error.message || 'Failed to restore backup')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Backup & Restore
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'backup'
                            ? 'border-avian-500 text-avian-600 dark:text-avian-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Download className="w-4 h-4 inline mr-2" />
                        Create Backup
                    </button>
                    <button
                        onClick={() => setActiveTab('restore')}
                        className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'restore'
                            ? 'border-avian-500 text-avian-600 dark:text-avian-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Restore Backup
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            {/* Backup Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Backup Type
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="backupType"
                                            value="full"
                                            checked={backupType === 'full'}
                                            onChange={(e) => setBackupType(e.target.value as 'full' | 'wallets')}
                                            className="mr-3"
                                        />
                                        <div className="flex items-center">
                                            <Database className="w-4 h-4 mr-2 text-blue-600" />
                                            <div>
                                                <span className="text-gray-900 dark:text-white font-medium">Full Backup</span>
                                                <p className="text-xs text-gray-500">Wallets, address book, and settings</p>
                                            </div>
                                        </div>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="backupType"
                                            value="wallets"
                                            checked={backupType === 'wallets'}
                                            onChange={(e) => setBackupType(e.target.value as 'full' | 'wallets')}
                                            className="mr-3"
                                        />
                                        <div className="flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-green-600" />
                                            <div>
                                                <span className="text-gray-900 dark:text-white font-medium">Wallets Only</span>
                                                <p className="text-xs text-gray-500">Only wallet data (keys and addresses)</p>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Encryption Options */}
                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={useEncryption}
                                        onChange={(e) => setUseEncryption(e.target.checked)}
                                        className="mr-3"
                                    />
                                    <div className="flex items-center">
                                        <Lock className="w-4 h-4 mr-2 text-amber-600" />
                                        <span className="text-gray-900 dark:text-white font-medium">Encrypt backup file</span>
                                    </div>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Recommended for security. You&apos;ll need this password to restore.
                                </p>
                            </div>

                            {/* Password Fields */}
                            {useEncryption && (
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Backup encryption password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                            )}

                            {/* Backup Summary */}
                            {backupSummary && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                                    <div className="flex items-center mb-2">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                        <span className="font-medium text-green-900 dark:text-green-200">Backup Created Successfully</span>
                                    </div>
                                    <div className="text-sm text-green-800 dark:text-green-300 space-y-1">
                                        <p>• {backupSummary.walletsCount} wallets backed up</p>
                                        <p>• {backupSummary.addressesCount} addresses backed up</p>
                                        <p>• Type: {backupSummary.backupType}</p>
                                        <p>• Encrypted wallets: {backupSummary.hasEncryptedWallets ? 'Yes' : 'No'}</p>
                                        <p>• Date: {backupSummary.date}</p>
                                    </div>
                                </div>
                            )}

                            {/* Create Backup Button */}
                            <button
                                onClick={handleCreateBackup}
                                disabled={isLoading || (useEncryption && (!password || password !== confirmPassword))}
                                className="w-full button-primary disabled:opacity-50"
                            >
                                {isLoading ? 'Creating Backup...' : 'Create & Download Backup'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'restore' && (
                        <div className="space-y-6">
                            {/* File Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Select Backup File
                                </label>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-avian-50 file:text-avian-700
                                        hover:file:bg-avian-100"
                                />
                            </div>

                            {/* Backup Preview */}
                            {backupPreview && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex items-center mb-2">
                                        <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                        <span className="font-medium text-blue-900 dark:text-blue-200">Backup Preview</span>
                                    </div>
                                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                                        <p>• Created: {new Date(backupPreview.timestamp).toLocaleDateString()}</p>
                                        <p>• Version: {backupPreview.version}</p>
                                        <p>• Wallets: {backupPreview.wallets.length}</p>
                                        <p>• Addresses: {backupPreview.addressBook.length}</p>
                                        <p>• Type: {backupPreview.metadata.backupType}</p>
                                        {backupPreview.wallets.some(w => w.isEncrypted) && (
                                            <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-600">
                                                <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                                                    ⚠️ This backup contains encrypted wallets. You&apos;ll need the individual wallet passwords when accessing them.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Restore Password */}
                            {selectedFile && !backupPreview && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Backup Password
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="password"
                                            placeholder="Enter backup encryption password"
                                            value={restorePassword}
                                            onChange={(e) => setRestorePassword(e.target.value)}
                                            className="input-field flex-1"
                                        />
                                        <button
                                            onClick={handlePasswordVerify}
                                            disabled={isLoading || !restorePassword}
                                            className="px-4 py-2 bg-avian-600 text-white rounded-lg hover:bg-avian-700 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? 'Verifying...' : 'Verify'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This backup file appears to be encrypted. Please enter the password to decrypt it.
                                    </p>
                                </div>
                            )}

                            {/* Restore Options */}
                            {backupPreview && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Restore Options
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreOptions.includeWallets}
                                                onChange={(e) => setRestoreOptions(prev => ({ ...prev, includeWallets: e.target.checked }))}
                                                className="mr-3"
                                            />
                                            <span className="text-gray-900 dark:text-white">Restore wallets ({backupPreview.wallets.length})</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreOptions.includeAddressBook}
                                                onChange={(e) => setRestoreOptions(prev => ({ ...prev, includeAddressBook: e.target.checked }))}
                                                className="mr-3"
                                            />
                                            <span className="text-gray-900 dark:text-white">Restore address book ({backupPreview.addressBook.length})</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreOptions.includeSettings}
                                                onChange={(e) => setRestoreOptions(prev => ({ ...prev, includeSettings: e.target.checked }))}
                                                className="mr-3"
                                            />
                                            <span className="text-gray-900 dark:text-white">Restore settings</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={restoreOptions.overwriteExisting}
                                                onChange={(e) => setRestoreOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                                                className="mr-3"
                                            />
                                            <span className="text-gray-900 dark:text-white">Overwrite existing data</span>
                                        </label>
                                    </div>
                                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
                                        <div className="flex items-start">
                                            <AlertCircle className="w-4 h-4 mr-2 text-amber-600 mt-0.5" />
                                            <div className="text-xs text-amber-800 dark:text-amber-200">
                                                <p className="font-medium">Warning:</p>
                                                <p>If &quot;Overwrite existing&quot; is checked, this will replace your current data. Otherwise, it will be merged with existing data.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Restore Button */}
                            <button
                                onClick={handleRestore}
                                disabled={!backupPreview}
                                className="w-full button-primary disabled:opacity-50"
                            >
                                {isLoading ? 'Restoring...' : 'Restore from Backup'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
