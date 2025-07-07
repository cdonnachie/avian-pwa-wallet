'use client'

import React, { useState, useEffect } from 'react'
import { WalletData } from '@/services/WalletService'
import { StorageService } from '@/services/StorageService'
import { useWallet } from '@/contexts/WalletContext'

interface WalletManagerProps {
    onWalletSelect?: (wallet: WalletData) => void
    onClose?: () => void
}

export function WalletManager({ onWalletSelect, onClose }: WalletManagerProps) {
    const { reloadActiveWallet } = useWallet()
    const [wallets, setWallets] = useState<WalletData[]>([])
    const [activeWallet, setActiveWallet] = useState<WalletData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showImportKeyForm, setShowImportKeyForm] = useState(false)
    const [showImportMnemonicForm, setShowImportMnemonicForm] = useState(false)
    const [newWalletName, setNewWalletName] = useState('')
    const [newWalletPassword, setNewWalletPassword] = useState('')
    const [newWalletPasswordConfirm, setNewWalletPasswordConfirm] = useState('')
    const [importWalletName, setImportWalletName] = useState('')
    const [importWalletPassword, setImportWalletPassword] = useState('')
    const [importWalletPasswordConfirm, setImportWalletPasswordConfirm] = useState('')
    const [importPrivateKey, setImportPrivateKey] = useState('')
    const [importMnemonic, setImportMnemonic] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    // Password validation helper
    const validatePassword = (password: string, confirmPassword: string): string | null => {
        if (!password) {
            return 'Password is required for wallet security'
        }
        if (password.length < 8) {
            return 'Password must be at least 8 characters long'
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match'
        }
        // Check for complexity (at least one number, one letter)
        if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
            return 'Password must contain at least one letter and one number'
        }
        return null
    }

    useEffect(() => {
        loadWallets()
    }, [])

    const loadWallets = async () => {
        try {
            setIsLoading(true)
            const allWallets = await StorageService.getAllWallets()
            const active = await StorageService.getActiveWallet()
            setWallets(allWallets)
            setActiveWallet(active)
        } catch (error) {
            console.error('Failed to load wallets:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSwitchWallet = async (walletId: number) => {
        try {
            const success = await StorageService.switchToWallet(walletId)
            if (success) {
                await loadWallets()

                // Reload the wallet context to update the UI
                await reloadActiveWallet()

                const newActiveWallet = wallets.find(w => w.id === walletId)
                if (newActiveWallet && onWalletSelect) {
                    onWalletSelect(newActiveWallet)
                }
            }
        } catch (error) {
            console.error('Failed to switch wallet:', error)
        }
    }

    const handleCreateWallet = async () => {
        if (!newWalletName.trim()) return

        // Validate password
        const passwordValidationError = validatePassword(newWalletPassword, newWalletPasswordConfirm)
        if (passwordValidationError) {
            setPasswordError(passwordValidationError)
            return
        }

        try {
            setIsCreating(true)
            setPasswordError('')

            // Use WalletService to create a proper wallet with real keys
            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.createNewWallet({
                name: newWalletName.trim(),
                password: newWalletPassword, // Now mandatory
                useMnemonic: true, // Generate with BIP39 mnemonic
                makeActive: true
            })

            await loadWallets()
            setShowCreateForm(false)
            setNewWalletName('')
            setNewWalletPassword('')
            setNewWalletPasswordConfirm('')

            // Reload the wallet context to update the UI
            await reloadActiveWallet()

            if (onWalletSelect) {
                onWalletSelect(newWallet)
            }
        } catch (error) {
            console.error('Failed to create wallet:', error)
            alert('Failed to create wallet: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteWallet = async (walletId: number) => {
        if (wallets.length <= 1) {
            alert('Cannot delete the last wallet')
            return
        }

        if (confirm('Are you sure you want to delete this wallet?')) {
            try {
                await StorageService.deleteWallet(walletId)
                await loadWallets()
            } catch (error) {
                console.error('Failed to delete wallet:', error)
            }
        }
    }

    const handleImportPrivateKey = async () => {
        if (!importWalletName.trim() || !importPrivateKey.trim()) return

        // Validate password
        const passwordValidationError = validatePassword(importWalletPassword, importWalletPasswordConfirm)
        if (passwordValidationError) {
            setPasswordError(passwordValidationError)
            return
        }

        try {
            setIsCreating(true)
            setPasswordError('')

            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.importWalletFromPrivateKey({
                name: importWalletName.trim(),
                privateKey: importPrivateKey.trim(),
                password: importWalletPassword, // Now mandatory
                makeActive: true
            })

            await loadWallets()
            setShowImportKeyForm(false)
            setImportWalletName('')
            setImportWalletPassword('')
            setImportWalletPasswordConfirm('')
            setImportPrivateKey('')

            await reloadActiveWallet()

            if (onWalletSelect) {
                onWalletSelect(newWallet)
            }
        } catch (error) {
            console.error('Failed to import wallet from private key:', error)
            alert('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsCreating(false)
        }
    }

    const handleImportMnemonic = async () => {
        if (!importWalletName.trim() || !importMnemonic.trim()) return

        // Validate password
        const passwordValidationError = validatePassword(importWalletPassword, importWalletPasswordConfirm)
        if (passwordValidationError) {
            setPasswordError(passwordValidationError)
            return
        }

        try {
            setIsCreating(true)
            setPasswordError('')

            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.importWalletFromMnemonic({
                name: importWalletName.trim(),
                mnemonic: importMnemonic.trim(),
                password: importWalletPassword, // Now mandatory
                makeActive: true
            })

            await loadWallets()
            setShowImportMnemonicForm(false)
            setImportWalletName('')
            setImportWalletPassword('')
            setImportWalletPasswordConfirm('')
            setImportMnemonic('')

            await reloadActiveWallet()

            if (onWalletSelect) {
                onWalletSelect(newWallet)
            }
        } catch (error) {
            console.error('Failed to import wallet from mnemonic:', error)
            alert('Failed to import wallet: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsCreating(false)
        }
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString()
    }

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Loading wallets...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Wallet Manager
                </h2>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="mb-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} total
                        </span>
                    </div>

                    {/* Wallet Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                            onClick={() => {
                                setShowCreateForm(!showCreateForm)
                                setShowImportKeyForm(false)
                                setShowImportMnemonicForm(false)
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            + New Wallet
                        </button>
                        <button
                            onClick={() => {
                                setShowImportKeyForm(!showImportKeyForm)
                                setShowCreateForm(false)
                                setShowImportMnemonicForm(false)
                            }}
                            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                            Import Private Key
                        </button>
                        <button
                            onClick={() => {
                                setShowImportMnemonicForm(!showImportMnemonicForm)
                                setShowCreateForm(false)
                                setShowImportKeyForm(false)
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            Import Mnemonic
                        </button>
                    </div>
                </div>
            </div>

            {showCreateForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Create New Wallet
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newWalletName}
                            onChange={(e) => setNewWalletName(e.target.value)}
                            placeholder="Wallet name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 text-sm">
                                    <p className="text-blue-800 dark:text-blue-200 font-medium">Security Requirement</p>
                                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                                        All wallets must be password protected for your security. Choose a strong password you&apos;ll remember.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <input
                            type="password"
                            value={newWalletPassword}
                            onChange={(e) => setNewWalletPassword(e.target.value)}
                            placeholder="Enter wallet password (required)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                            type="password"
                            value={newWalletPasswordConfirm}
                            onChange={(e) => setNewWalletPasswordConfirm(e.target.value)}
                            placeholder="Confirm wallet password"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />

                        {passwordError && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-200">{passwordError}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateWallet}
                                disabled={isCreating || !newWalletName.trim() || !newWalletPassword || !newWalletPasswordConfirm}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Creating...' : 'Create Wallet'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false)
                                    setNewWalletName('')
                                    setNewWalletPassword('')
                                    setNewWalletPasswordConfirm('')
                                    setPasswordError('')
                                }}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Private Key Form */}
            {showImportKeyForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Import Private Key
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={importWalletName}
                            onChange={(e) => setImportWalletName(e.target.value)}
                            placeholder="Wallet name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <textarea
                            value={importPrivateKey}
                            onChange={(e) => setImportPrivateKey(e.target.value)}
                            placeholder="Enter your private key (WIF format)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-20 resize-none"
                        />

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 text-sm">
                                    <p className="text-amber-800 dark:text-amber-200 font-medium">Security Required</p>
                                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                                        Your imported wallet will be encrypted with a password for security.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <input
                            type="password"
                            value={importWalletPassword}
                            onChange={(e) => setImportWalletPassword(e.target.value)}
                            placeholder="Create wallet password (required)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                            type="password"
                            value={importWalletPasswordConfirm}
                            onChange={(e) => setImportWalletPasswordConfirm(e.target.value)}
                            placeholder="Confirm wallet password"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />

                        {passwordError && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-200">{passwordError}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleImportPrivateKey}
                                disabled={isCreating || !importWalletName.trim() || !importPrivateKey.trim() || !importWalletPassword || !importWalletPasswordConfirm}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Importing...' : 'Import Wallet'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowImportKeyForm(false)
                                    setImportWalletName('')
                                    setImportWalletPassword('')
                                    setImportWalletPasswordConfirm('')
                                    setImportPrivateKey('')
                                    setPasswordError('')
                                }}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Mnemonic Form */}
            {showImportMnemonicForm && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Import Mnemonic Phrase
                    </h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={importWalletName}
                            onChange={(e) => setImportWalletName(e.target.value)}
                            placeholder="Wallet name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <textarea
                            value={importMnemonic}
                            onChange={(e) => setImportMnemonic(e.target.value)}
                            placeholder="Enter your 12-word mnemonic phrase (separated by spaces)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-20 resize-none"
                        />

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 text-sm">
                                    <p className="text-green-800 dark:text-green-200 font-medium">Secure Recovery</p>
                                    <p className="text-green-700 dark:text-green-300 mt-1">
                                        Your recovered wallet will be encrypted with a password for enhanced security.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <input
                            type="password"
                            value={importWalletPassword}
                            onChange={(e) => setImportWalletPassword(e.target.value)}
                            placeholder="Create wallet password (required)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <input
                            type="password"
                            value={importWalletPasswordConfirm}
                            onChange={(e) => setImportWalletPasswordConfirm(e.target.value)}
                            placeholder="Confirm wallet password"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />

                        {passwordError && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-200">{passwordError}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleImportMnemonic}
                                disabled={isCreating || !importWalletName.trim() || !importMnemonic.trim() || !importWalletPassword || !importWalletPasswordConfirm}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Importing...' : 'Import Wallet'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowImportMnemonicForm(false)
                                    setImportWalletName('')
                                    setImportWalletPassword('')
                                    setImportWalletPasswordConfirm('')
                                    setImportMnemonic('')
                                    setPasswordError('')
                                }}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {wallets.map((wallet) => (
                    <div
                        key={wallet.id}
                        className={`p-3 sm:p-4 rounded-lg border transition-all ${wallet.isActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                        {wallet.name}
                                    </h3>
                                    {wallet.isActive && (
                                        <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full flex-shrink-0">
                                            Active
                                        </span>
                                    )}
                                    {wallet.isEncrypted && (
                                        <span className="px-2 py-1 text-xs bg-yellow-500 text-white rounded-full flex-shrink-0">
                                            🔒 Encrypted
                                        </span>
                                    )}
                                    {wallet.mnemonic && (
                                        <span className="px-2 py-1 text-xs bg-green-600 text-white rounded-full flex-shrink-0">
                                            HD Wallet
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                                    {wallet.address}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    <div>Created: {formatDate(wallet.createdAt)}</div>
                                    <div>Last accessed: {formatDate(wallet.lastAccessed)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!wallet.isActive && (
                                    <button
                                        onClick={() => handleSwitchWallet(wallet.id!)}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Switch
                                    </button>
                                )}
                                {wallets.length > 1 && (
                                    <button
                                        onClick={() => handleDeleteWallet(wallet.id!)}
                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {wallets.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        No wallets found. Create your first wallet to get started.
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create First Wallet
                    </button>
                </div>
            )}
        </div>
    )
}
