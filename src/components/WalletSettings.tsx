'use client'

import { useState } from 'react'
import { Settings, Download, Lock, Unlock, FileText, Wallet, TestTube, Database } from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import MnemonicModal from './MnemonicModal'
import { WalletManager } from './WalletManager'
import BackupModal from './BackupModal'
import { addSampleTransactions, clearAllTransactions } from '@/utils/transaction-test'

export default function WalletSettings() {
    const {
        exportPrivateKey,
        encryptWallet,
        decryptWallet,
        isEncrypted,
        address,
        reloadActiveWallet,
        cleanupMisclassifiedTransactions,
        reprocessTransactionHistory,
        reprocessTransactionHistoryProgressive,
        processingProgress
    } = useWallet()

    const [showForm, setShowForm] = useState<string | null>(null)
    const [showMnemonicModal, setShowMnemonicModal] = useState(false)
    const [showWalletManager, setShowWalletManager] = useState(false)
    const [showBackupModal, setShowBackupModal] = useState(false)
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

    const handleAddSampleTransactions = async () => {
        if (!address) {
            setError('No active wallet found')
            return
        }

        try {
            setIsLoading(true)
            await addSampleTransactions(address)
            setSuccess('Sample transactions added for testing!')
        } catch (error) {
            setError('Failed to add sample transactions')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClearTransactions = async () => {
        if (!confirm('Are you sure you want to clear all transaction history?')) {
            return
        }

        try {
            setIsLoading(true)
            await clearAllTransactions()
            setSuccess('All transactions cleared!')
        } catch (error) {
            setError('Failed to clear transactions')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCleanupMisclassifiedTransactions = async () => {
        if (!address) {
            setError('No active wallet found')
            return
        }

        if (!confirm('This will remove "received" transactions that are actually change outputs from your own sent transactions.\n\nFor example, if you sent 4 AVN and received 5.99990000 AVN as change, the change transaction will be removed from your transaction history.\n\nContinue?')) {
            return
        }

        try {
            setIsLoading(true)
            const cleanedCount = await cleanupMisclassifiedTransactions()
            setSuccess(`Cleaned up ${cleanedCount} misclassified transactions!`)
        } catch (error) {
            setError('Failed to cleanup misclassified transactions')
        } finally {
            setIsLoading(false)
        }
    }

    const handleReprocessTransactionHistory = async () => {
        if (!address) {
            setError('No active wallet found')
            return
        }

        if (!confirm('This will clear all existing transaction history and reprocess it from the blockchain with updated classification logic.\n\nThis will properly classify sent vs received transactions and may take a while for wallets with many transactions.\n\nContinue?')) {
            return
        }

        try {
            const processedCount = await reprocessTransactionHistory()
            setSuccess(`Reprocessed ${processedCount} transactions!`)
        } catch (error) {
            setError('Failed to reprocess transaction history')
        }
    }

    const handleReprocessTransactionHistoryProgressive = async () => {
        if (!address) {
            setError('No active wallet found')
            return
        }

        if (!confirm('This will clear all existing transaction history and reprocess it from the blockchain with updated classification logic.\n\nTransactions will appear in the UI as they are processed for real-time progress.\n\nContinue?')) {
            return
        }

        try {
            const processedCount = await reprocessTransactionHistoryProgressive()
            setSuccess(`Progressively processed ${processedCount} transactions!`)
        } catch (error) {
            setError('Failed to progressively process transaction history')
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

                {/* Development Test Section */}
                {address && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Development Tools
                        </h5>

                        {/* Processing Progress */}
                        {processingProgress.isProcessing && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                        Processing Transactions...
                                    </span>
                                    <span className="text-xs text-blue-700 dark:text-blue-300">
                                        {processingProgress.processed}/{processingProgress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: processingProgress.total > 0
                                                ? `${(processingProgress.processed / processingProgress.total) * 100}%`
                                                : '0%'
                                        }}
                                    />
                                </div>
                                {processingProgress.currentTx && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                        Current: {processingProgress.currentTx.slice(0, 16)}...
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <button
                                onClick={handleAddSampleTransactions}
                                disabled={isLoading || processingProgress.isProcessing}
                                className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <TestTube className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                                    <span className="text-blue-900 dark:text-blue-100 text-sm">
                                        Add Sample Transactions
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={handleClearTransactions}
                                disabled={isLoading || processingProgress.isProcessing}
                                className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg transition-colors border border-red-200 dark:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <TestTube className="w-4 h-4 mr-3 text-red-600 dark:text-red-400" />
                                    <span className="text-red-900 dark:text-red-100 text-sm">
                                        Clear All Transactions
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={handleCleanupMisclassifiedTransactions}
                                disabled={isLoading || processingProgress.isProcessing}
                                className="w-full flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-800/30 rounded-lg transition-colors border border-yellow-200 dark:border-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <TestTube className="w-4 h-4 mr-3 text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-yellow-900 dark:text-yellow-100 text-sm">
                                        Cleanup Misclassified Transactions
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={handleReprocessTransactionHistory}
                                disabled={isLoading || processingProgress.isProcessing}
                                className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/30 rounded-lg transition-colors border border-purple-200 dark:border-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <TestTube className="w-4 h-4 mr-3 text-purple-600 dark:text-purple-400" />
                                    <span className="text-purple-900 dark:text-purple-100 text-sm">
                                        Reprocess Transaction History
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={handleReprocessTransactionHistoryProgressive}
                                disabled={isLoading || processingProgress.isProcessing}
                                className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-800/30 rounded-lg transition-colors border border-green-200 dark:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center">
                                    <TestTube className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                                    <span className="text-green-900 dark:text-green-100 text-sm">
                                        Progressive Reprocess (Real-time UI Updates)
                                    </span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                            <strong>Note:</strong> Real transaction sending is now enabled via ElectrumX with Avian fork ID (0x40) support.
                            Test carefully with small amounts first!
                        </div>
                    </div>
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

                        {(showForm === 'export' || showForm === 'decrypt') && (
                            <input
                                type="password"
                                placeholder="Password (if encrypted)"
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
        </div>
    )
}
