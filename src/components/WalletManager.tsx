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
    const [importWalletName, setImportWalletName] = useState('')
    const [importPrivateKey, setImportPrivateKey] = useState('')
    const [importMnemonic, setImportMnemonic] = useState('')
    const [isCreating, setIsCreating] = useState(false)

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

        try {
            setIsCreating(true)

            // Use WalletService to create a proper wallet with real keys
            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.createNewWallet({
                name: newWalletName.trim(),
                useMnemonic: true, // Generate with BIP39 mnemonic
                makeActive: true
            })

            await loadWallets()
            setShowCreateForm(false)
            setNewWalletName('')

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

        try {
            setIsCreating(true)

            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.importWalletFromPrivateKey({
                name: importWalletName.trim(),
                privateKey: importPrivateKey.trim(),
                makeActive: true
            })

            await loadWallets()
            setShowImportKeyForm(false)
            setImportWalletName('')
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

        try {
            setIsCreating(true)

            const { WalletService } = await import('@/services/WalletService')
            const walletService = new WalletService()

            const newWallet = await walletService.importWalletFromMnemonic({
                name: importWalletName.trim(),
                mnemonic: importMnemonic.trim(),
                makeActive: true
            })

            await loadWallets()
            setShowImportMnemonicForm(false)
            setImportWalletName('')
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
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newWalletName}
                            onChange={(e) => setNewWalletName(e.target.value)}
                            placeholder="Wallet name"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateWallet()}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreateWallet}
                                disabled={isCreating || !newWalletName.trim()}
                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false)
                                    setNewWalletName('')
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportPrivateKey}
                                disabled={isCreating || !importWalletName.trim() || !importPrivateKey.trim()}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Importing...' : 'Import'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowImportKeyForm(false)
                                    setImportWalletName('')
                                    setImportPrivateKey('')
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportMnemonic}
                                disabled={isCreating || !importWalletName.trim() || !importMnemonic.trim()}
                                className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Importing...' : 'Import'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowImportMnemonicForm(false)
                                    setImportWalletName('')
                                    setImportMnemonic('')
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
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
