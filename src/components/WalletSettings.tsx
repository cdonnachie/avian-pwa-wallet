'use client'

import { useState } from 'react'
import { Settings, Download, Lock, Unlock, FileText, Wallet, Database, Shield } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useSecurity } from '@/contexts/SecurityContext'
import MnemonicModal from './MnemonicModal'
import { WalletManager } from './WalletManager'
import BackupModal from './BackupModal'
import SecuritySettingsPanel from './SecuritySettingsPanel'

export default function WalletSettings() {
    const {
        exportPrivateKey,
        encryptWallet,
        decryptWallet,
        isEncrypted,
        address,
        reloadActiveWallet
    } = useWallet()

    const { lockWallet, isLocked } = useSecurity()

    const [showForm, setShowForm] = useState<string | null>(null)
    const [showMnemonicModal, setShowMnemonicModal] = useState(false)
    const [showWalletManager, setShowWalletManager] = useState(false)
    const [showBackupModal, setShowBackupModal] = useState(false)
    const [showSecuritySettings, setShowSecuritySettings] = useState(false)
    const [mnemonicModalMode, setMnemonicModalMode] = useState<'export' | 'import'>('export')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [exportedKey, setExportedKey] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const resetForm = () => {
        setShowForm(null)
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setExportedKey('')
        setError('')
        setSuccess('')
    }

    const handleExportPrivateKey = async () => {
        try {
            setIsLoading(true)
            setError('')
            const key = await exportPrivateKey(password || undefined)
            setExportedKey(key)
            setSuccess('Private key exported!')
        } catch (error: any) {
            setError(error.message || 'Failed to export private key')
        } finally {
            setIsLoading(false)
        }
    }

    const handleEncryptWallet = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        try {
            setIsLoading(true)
            setError('')
            await encryptWallet(newPassword)
            setSuccess('Wallet encrypted successfully!')
            resetForm()
        } catch (error: any) {
            setError(error.message || 'Failed to encrypt wallet')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDecryptWallet = async () => {
        if (!password) {
            setError('Please enter your password')
            return
        }

        try {
            setIsLoading(true)
            setError('')
            await decryptWallet(password)
            setSuccess('Wallet decrypted successfully!')
            resetForm()
        } catch (error: any) {
            setError(error.message || 'Failed to decrypt wallet')
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setSuccess('Copied to clipboard!')
            setTimeout(() => setSuccess(''), 2000)
        } catch (error) {
            setError('Failed to copy to clipboard')
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center mb-6">
                <Settings className="w-5 h-5 mr-2 text-avian-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Wallet Settings
                </h3>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
                    {success}
                </div>
            )}

            <div className="space-y-3">
                {/* Wallet Manager */}
                <button
                    onClick={() => setShowWalletManager(true)}
                    className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                >
                    <div className="flex items-center">
                        <Wallet className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                        <div className="text-left">
                            <span className="text-blue-900 dark:text-blue-100 font-medium block">Manage Wallets</span>
                            <span className="text-blue-700 dark:text-blue-300 text-xs">Create, import, and switch between multiple wallets</span>
                        </div>
                    </div>
                </button>

                {/* Export Private Key */}
                {address && (
                    <button
                        onClick={() => setShowForm('export')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        <div className="flex items-center">
                            <Download className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                            <span className="text-gray-900 dark:text-white">Export Private Key</span>
                        </div>
                    </button>
                )}

                {/* Export Mnemonic */}
                {address && (
                    <button
                        onClick={() => {
                            setMnemonicModalMode('export')
                            setShowMnemonicModal(true)
                        }}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                    >
                        <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                            <div className="text-left">
                                <span className="text-blue-900 dark:text-blue-100 font-medium block">Export Mnemonic</span>
                                <span className="text-blue-700 dark:text-blue-300 text-xs">12 word seed phrase</span>
                            </div>
                        </div>
                    </button>
                )}

                {/* Backup & Restore */}
                <button
                    onClick={() => setShowBackupModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors border border-green-200 dark:border-green-700"
                >
                    <div className="flex items-center">
                        <Database className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                        <div className="text-left">
                            <span className="text-green-900 dark:text-green-100 font-medium block">Backup & Restore</span>
                            <span className="text-green-700 dark:text-green-300 text-xs">Export/import wallet data and settings</span>
                        </div>
                    </div>
                </button>

                {/* Security Settings */}
                <button
                    onClick={() => setShowSecuritySettings(true)}
                    className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors border border-purple-200 dark:border-purple-700"
                >
                    <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-3 text-purple-600 dark:text-purple-400" />
                        <div className="text-left">
                            <span className="text-purple-900 dark:text-purple-100 font-medium block">Security Settings</span>
                            <span className="text-purple-700 dark:text-purple-300 text-xs">Biometric auth, auto-lock, audit log</span>
                        </div>
                    </div>
                </button>

                {/* Encrypt/Decrypt Wallet */}
                {address && (
                    <button
                        onClick={() => setShowForm(isEncrypted ? 'decrypt' : 'encrypt')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        <div className="flex items-center">
                            {isEncrypted ? (
                                <Unlock className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                            ) : (
                                <Lock className="w-4 h-4 mr-3 text-gray-600 dark:text-gray-400" />
                            )}
                            <span className="text-gray-900 dark:text-white">
                                {isEncrypted ? 'Decrypt Wallet' : 'Encrypt Wallet'}
                            </span>
                        </div>
                    </button>
                )}


            </div>

            {/* Forms */}
            {showForm && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            {showForm === 'export' && 'Export Private Key'}
                            {showForm === 'encrypt' && 'Encrypt Wallet'}
                            {showForm === 'decrypt' && 'Decrypt Wallet'}
                        </h4>
                        <button
                            onClick={resetForm}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(showForm === 'encrypt') && (
                            <>
                                <input
                                    type="password"
                                    placeholder="New password (optional)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-field"
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field"
                                />
                            </>
                        )}

                        {(showForm === 'export' || showForm === 'decrypt') && isEncrypted && (
                            <input
                                type="password"
                                placeholder="Enter wallet password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                            />
                        )}

                        {showForm === 'export' && exportedKey && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Private Key (keep secure!)
                                </label>
                                <div className="flex space-x-2">
                                    <textarea
                                        value={exportedKey}
                                        readOnly
                                        className="input-field h-20 resize-none font-mono text-xs"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(exportedKey)}
                                        className="px-3 py-2 bg-avian-600 text-white rounded-lg hover:bg-avian-700 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (showForm === 'export') handleExportPrivateKey()
                                else if (showForm === 'encrypt') handleEncryptWallet()
                                else if (showForm === 'decrypt') handleDecryptWallet()
                            }}
                            disabled={isLoading}
                            className="w-full button-primary disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            )}

            {/* Wallet Status */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                    Wallet Status
                </h5>
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <p>Address: {address ? `${address.slice(0, 10)}...${address.slice(-10)}` : 'No wallet loaded'}</p>
                    <p>Encryption: {isEncrypted ? 'Enabled' : 'Disabled'}</p>
                </div>
            </div>

            {/* Server Management Info */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Server Connection
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Manage ElectrumX server connections in the main interface
                        </p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        See connection status below ↓
                    </div>
                </div>
            </div>

            {/* Mnemonic Modal */}
            {showMnemonicModal && (
                <MnemonicModal
                    isOpen={showMnemonicModal}
                    mode={mnemonicModalMode}
                    onClose={() => setShowMnemonicModal(false)}
                />
            )}

            {/* Wallet Manager Modal */}
            {showWalletManager && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <WalletManager
                        onClose={async () => {
                            setShowWalletManager(false)
                            await reloadActiveWallet()
                        }}
                        onWalletSelect={async (wallet) => {
                            setShowWalletManager(false)
                            await reloadActiveWallet()
                            setSuccess(`Switched to wallet: ${wallet.name}`)
                        }}
                    />
                </div>
            )}

            {/* Backup Modal */}
            {showBackupModal && (
                <BackupModal
                    isOpen={showBackupModal}
                    onClose={() => setShowBackupModal(false)}
                    onSuccess={(message) => {
                        setSuccess(message)
                        setTimeout(() => setSuccess(''), 3000)
                    }}
                    onError={(message) => {
                        setError(message)
                        setTimeout(() => setError(''), 5000)
                    }}
                />
            )}

            {/* Security Settings Modal */}
            {showSecuritySettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
                            <button
                                onClick={() => setShowSecuritySettings(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                            <SecuritySettingsPanel />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
